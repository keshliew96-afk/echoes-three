import sys,re,json,subprocess,os
code,i,out=sys.argv[1],sys.argv[2],sys.argv[3]
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
jar=f"{out}/jar{i}.txt"
loc=subprocess.run(["curl","-sS","-o","/dev/null","-w","%{redirect_url}","-A",UA,f"https://vt.tiktok.com/{code}/"],capture_output=True,text=True).stdout
url=loc.split('?')[0]
h=subprocess.run(["curl","-sS","-c",jar,"-b",jar,"-A",UA,url],capture_output=True,text=True).stdout
m=re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>',h,re.S)
d=json.loads(m.group(1))
it=d['__DEFAULT_SCOPE__']['webapp.video-detail']['itemInfo']['itemStruct']
json.dump(it,open(f"{out}/v{i}.item.json","w"),ensure_ascii=False,indent=1)
v=it['video']
play=v.get('playAddr') or v.get('downloadAddr')
r=subprocess.run(["curl","-sS","-L","-c",jar,"-b",jar,"-A",UA,"-e","https://www.tiktok.com/","-o",f"{out}/v{i}.mp4","-w","%{http_code} %{size_download}",play],capture_output=True,text=True)
print(i,url,r.stdout,r.stderr[:200],"|",it.get('desc'),"| dur",v.get('duration'),"| author",it['author'].get('uniqueId'))
for s in v.get('subtitleInfos') or []:
  print("  sub",s.get('LanguageCodeName'),s.get('Format'),s.get('Source'))
  fn=f"{out}/v{i}.{s.get('LanguageCodeName')}.{s.get('Format','vtt').lower()}"
  subprocess.run(["curl","-sS","-c",jar,"-b",jar,"-A",UA,"-o",fn,s['Url']])
