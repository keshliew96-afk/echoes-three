# Mouse healer foot locks and IK run (docs/MOUSE_HEALER.md "Self-check").
# Run inside Blender with the mouse healer .blend open (Text Editor > Run, or
# Blender MCP). Three parts, in the order they were run for v0.5.330:
#   1. ik_leg(): an analytic two-bone IK for each leg (thigh, shin) that puts
#      the ankle exactly on a target, keeps the knee in the clip's own knee
#      plane and the bone roll of the clip, and sets the foot's world rotation.
#   2. lock_bake(): FOOT LOCKS for a standing clip. A planted foot (ankle within
#      5 cm of its rest height, body upright) is locked to the floor; it only
#      steps when the clip's stance moves it more than step_dist, over
#      step_frames with a small lift. The foot that moves WITH the body steps
#      first (the lead foot); the one left behind is the push-off anchor and
#      steps only once it trails 2.5x as far. Near the end the feet settle back
#      to the clip's last stance (or settle_to, for a chain like the combo), so
#      clips still meet each other. Every frame is then baked (the IK targets
#      are the locks), so the clip keeps no constraints.
#   3. gen_loco(): the four-way run built from IK foot paths: the planted foot
#      moves back at exactly the body's speed (2.4 u/s in game units at rate 1)
#      for a third of a 12-frame cycle, then swings forward with a lift.

# ===================== ik_tools =====================

import bpy, math
from mathutils import Vector, Matrix, Quaternion
ARM=bpy.data.objects['MouseHealer_Rig']
LEG={'L':('Bone_017','Bone_016','Bone_015'),'R':('Bone_022','Bone_021','Bone_020')}
def upd(): bpy.context.view_layer.update()
def bone_len(n): return ARM.data.bones[n].length
def ik_leg(side, T, foot_rot=None, bend_hint=None, bases=None):
    th,sh,ft=LEG[side]; P=ARM.pose.bones
    H=P[th].head.copy(); K0=P[sh].head.copy(); A0=P[ft].head.copy()
    L1=(ARM.data.bones[sh].head_local-ARM.data.bones[th].head_local).length
    L2=(ARM.data.bones[ft].head_local-ARM.data.bones[sh].head_local).length
    v=T-H; d=v.length
    dmax=(L1+L2)*0.999; dmin=abs(L1-L2)*1.01+1e-4
    if d>dmax: T=H+v.normalized()*dmax; v=T-H; d=dmax
    if d<dmin: T=H+v.normalized()*dmin; v=T-H; d=dmin
    u=v.normalized()
    b=(bend_hint.copy() if bend_hint is not None else (K0-H))
    b=b-u*b.dot(u)
    if b.length<1e-5:
        b=bend_hint.copy() if bend_hint else Vector((0,-1,0))
        b=b-u*b.dot(u)
    b.normalize()
    a=(L1*L1-L2*L2+d*d)/(2*d); h=math.sqrt(max(0.0,L1*L1-a*a))
    K=H+u*a+b*h
    # thigh: rotate its current pose matrix so its Y axis points H->K
    def aim(pbn, head, target):
        pb=P[pbn]; M=(bases[pbn] if bases and pbn in bases else pb.matrix).copy()
        cur=(M.to_3x3()@Vector((0,1,0))).normalized()
        q=cur.rotation_difference((target-head).normalized())
        R=(q.to_matrix()@M.to_3x3()).to_4x4(); R.translation=head
        pb.matrix=R; upd()
    aim(th,H,K)
    aim(sh,P[sh].head.copy(),T)
    if foot_rot is not None:
        F=foot_rot.to_4x4(); F.translation=P[ft].head.copy(); P[ft].matrix=F; upd()
    return (P[ft].head-T).length
def key_legs(f, sides=('L','R')):
    for s in sides:
        for n in LEG[s]:
            P=ARM.pose.bones[n]; P.rotation_mode='QUATERNION'; P.keyframe_insert('rotation_quaternion',frame=f)

# ===================== lock_tools =====================

exec(bpy.data.texts['ik_tools'].as_string())
import math
from mathutils import Vector
S=bpy.context.scene
def cb_of(act): return act.layers[0].strips[0].channelbag(act.slots[0])
def sample(act, f0, f1):
    out={}
    for f in range(f0,f1+1):
        S.frame_set(f); P=ARM.pose.bones
        root_tilt=abs(P['Bone_000'].rotation_quaternion.to_euler().x)+abs(P['Bone_000'].rotation_quaternion.to_euler().y)
        out[f]={s:(P[LEG[s][2]].head.copy(), P[LEG[s][2]].matrix.to_3x3().copy(), (P[LEG[s][1]].head-P[LEG[s][0]].head).copy(), {LEG[s][0]:P[LEG[s][0]].matrix.copy(), LEG[s][1]:P[LEG[s][1]].matrix.copy()}) for s in LEG}
        out[f]['tilt']=root_tilt
        out[f]['root']=P['Bone_000'].head.copy()
    return out
def lock_bake(name, step_dist=0.08, step_frames=4, lift=0.05, ground_tol=0.05, settle=True, upright_max=0.35, start_locks=None, settle_to=None):
    act=bpy.data.actions[name]; ARM.animation_data.action=act; ARM.animation_data.action_slot=act.slots[0]
    f0,f1=int(act.frame_range[0]),int(act.frame_range[1])
    smp=sample(act,f0,f1)
    rest_z={s:ARM.data.bones[LEG[s][2]].head_local.z for s in LEG}
    targets={f:{} for f in smp}
    st={x:{'lock':(start_locks[x].copy() if start_locks else smp[f0][x][0].copy()),'step':None} for x in LEG}
    goal={x:(settle_to[x].copy() if settle_to else smp[f1][x][0].copy()) for x in LEG}
    settle_at={'L':f1-2*step_frames-2,'R':f1-step_frames-1}
    for f in range(f0,f1+1):
        # who wants to step this frame: the foot farthest from its pose steps first
        fa=min(f1,f+step_frames); rv=(smp[fa]['root']-smp[f]['root']).xy
        def lead(x):
            d=(smp[fa][x][0].xy-st[x]['lock'].xy)
            return d.dot(rv) if rv.length>0.005 else d.length
        order=sorted(LEG, key=lambda x: -lead(x))
        for x in order:
            A=smp[f][x][0]; o=[y for y in LEG if y!=x][0]
            rv=(smp[fa]['root']-smp[f]['root']).xy
            grounded=(A.z-rest_z[x] < ground_tol) and smp[f]['tilt']<upright_max
            if not grounded:
                targets[f][x]=A.copy(); st[x]['lock']=A.copy(); st[x]['step']=None; continue
            if st[x]['step']:
                a_,b_,fs,fe=st[x]['step']
                k=min(1,(f-fs)/max(1,fe-fs)); k2=k*k*(3-2*k)
                p=a_.lerp(b_,k2); p.z=max(A.z,p.z)+lift*math.sin(math.pi*k)
                targets[f][x]=p
                if f>=fe: st[x]['lock']=b_.copy(); st[x]['step']=None
                continue
            lock=st[x]['lock']
            want_settle=settle and f==settle_at[x] and (lock.xy-goal[x].xy).length>0.01
            other_busy=st[o]['step'] is not None
            # the foot moving WITH the body steps (it leads); the one left behind is
            # the push-off anchor and only steps once it trails far behind
            trailing = rv.length>0.005 and (A.xy-lock.xy).dot(rv) < 0
            thresh = step_dist*(2.5 if trailing else 1.0)
            if ((A.xy-lock.xy).length>thresh and not other_busy) or want_settle:
                fe=min(f1,f+step_frames); b_=(goal[x] if want_settle else smp[fe][x][0]).copy()
                st[x]['step']=(lock.copy(),b_,f,fe)
            p=lock.copy(); p.z=A.z
            targets[f][x]=p
    # one foot steps at a time is not enforced; report overlaps
    # bake: remove leg fcurves then key every frame
    cb=cb_of(act)
    names={n for s in LEG for n in LEG[s]}
    for fc in list(cb.fcurves):
        if fc.data_path.split('"')[1] in names: cb.fcurves.remove(fc)
    for f in range(f0,f1+1):
        S.frame_set(f)
        for s in LEG:
            ik_leg(s, targets[f][s], smp[f][s][1], bend_hint=smp[f][s][2], bases=smp[f][s][3])
        key_legs(f)
    return targets, {x:targets[f1][x].copy() for x in LEG}, {x:smp[f0][x][0].copy() for x in LEG}
def foot_report(name):
    act=bpy.data.actions[name]; ARM.animation_data.action=act; ARM.animation_data.action_slot=act.slots[0]
    f0,f1=int(act.frame_range[0]),int(act.frame_range[1])
    rest_z={s:ARM.data.bones[LEG[s][2]].head_local.z for s in LEG}
    rep={}
    for s in LEG:
        prev=None; worst=0; tot=0
        for f in range(f0,f1+1):
            S.frame_set(f); A=ARM.pose.bones[LEG[s][2]].head.copy()
            planted=A.z-rest_z[s]<0.02
            if prev is not None and planted and prev[1]:
                d=(A.xy-prev[0].xy).length; worst=max(worst,d); tot+=d
            prev=(A,planted)
        rep[s]=(round(worst*100,2), round(tot*100,1))
    return rep

# ===================== loco_gen =====================

exec(bpy.data.texts['epic_common'].as_string())
exec(bpy.data.texts['ik_tools'].as_string())
import math
from mathutils import Vector, Matrix
SC=bpy.context.scene
SCALE=1.1/1.7
GAME_SPEED=2.4
N=12; SF=4/12
V=GAME_SPEED/SCALE/30.0          # model units per frame the body travels
STRIDE=V*N*SF                    # stance foot travel
LIFT_H=0.11
L_ = bpy.data.texts['epic_loops'].as_string()
exec(L_[L_.index('# RUN'):L_.index("key_loop('Run'")])   # defines run(f) on a 20-frame cycle
LEGB={'Bone_017','Bone_016','Bone_015','Bone_022','Bone_021','Bone_020'}
REST={s:ARM.data.bones[LEG[s][2]].head_local.copy() for s in LEG}
FOOTROT={s:ARM.data.bones[LEG[s][2]].matrix_local.to_3x3().copy() for s in LEG}
def upper(fr, kind):
    d,_=run(fr*20.0/N)
    d={k:v for k,v in d.items() if k not in LEGB and k!='Bone_001'}
    if kind=='back':
        d=add({k:v for k,v in d.items() if k not in ('Bone_012','Bone_011','Bone_010','Bone_024','Bone_023')},spine(-4,0,6*math.cos(2*math.pi*fr/N)),head(2,0,-4*math.cos(2*math.pi*fr/N)))
    elif kind in ('left','right'):
        sg=1 if kind=='left' else -1
        d=add({k:v for k,v in d.items() if k not in ('Bone_012','Bone_011','Bone_010','Bone_024','Bone_023')},spine(8,sg*7,0),head(-6,-sg*5,0))
    return d
def foot_target(s, fr, dirv, kind):
    off=0.5 if kind in ('fwd','back') else 0.22  # strafes skip: trail foot follows the lead foot
    lead='L' if kind=='left' else 'R'
    u=((fr/N)+(0.0 if (s=='L' if kind in ('fwd','back') else s==lead) else off))%1.0
    if u<SF:
        k=u/SF; along=STRIDE/2-STRIDE*k; up=0.0
    else:
        k=(u-SF)/(1-SF); k2=k*k*(3-2*k); along=-STRIDE/2+STRIDE*k2; up=LIFT_H*math.sin(math.pi*k)
    base=REST[s].copy()
    if kind in ('left','right'):
        base.y += (-0.06 if s=='L' else 0.08)   # stagger so the feet never cross
        base.x += (0.05 if s=='L' else -0.05)
    p=base+Vector((dirv[0],dirv[1],0))*along
    p.z+=up
    return p, u<SF
def gen_loco(name, dirv, kind, drop=0.06):
    ad=ARM.animation_data
    old=bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    act=bpy.data.actions.new(name); act.use_fake_user=True; ad.action=act; ad.action_slot=None
    for f in range(0,N+1):
        dcomb={}
        for b in ARM.pose.bones:
            dl=DELAY.get(b.name,0)
            src=upper((f-dl)%N,kind)
            if b.name in src: dcomb[b.name]=src[b.name]
        flight=0.5+0.5*math.cos(2*math.pi*(f/N)*2+math.pi)  # 2 flights per cycle
        pose(dcomb,(0,0,-drop+0.025*flight),frame=f,ground=False)
        upd()
        for s in LEG:
            T,_=foot_target(s,f%N,dirv,kind)
            ik_leg(s,T,FOOTROT[s])
        key_legs(f)
    act.use_frame_range=True; act.frame_range=(0,N); act.use_cyclic=True
    if not act.slots: pass
    return act
def stance_speed(name, dirv):
    act=bpy.data.actions[name]; ARM.animation_data.action=act; ARM.animation_data.action_slot=act.slots[0]
    out=[]
    for s in LEG:
        prev=None
        for f in range(0,N+1):
            SC.frame_set(f); A=ARM.pose.bones[LEG[s][2]].head.copy()
            if prev is not None and A.z<REST[s].z+0.01 and prev.z<REST[s].z+0.01:
                v=(A-prev).xy; out.append((round(v.dot(Vector(dirv)),4), round((v-Vector(dirv)*v.dot(Vector(dirv))).length,4)))
            prev=A
    return out
