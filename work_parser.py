import requests
import ast
import json
import time

arr = []
count = 0


def functt(g):
    global count
    kode = str(g)
    data = '{"postalCode":"'+kode+'","limit":1}'
    response = requests.post('https://www.pochta.ru/suggestions/v2/postoffice.find-nearest-by-postalcode-raw-filters', headers={"content-type":"application/json"}, data=data)
    pochta = json.loads(response.content)
    print(g)
    if len(pochta) == 0:
        pass
    else:
        pochta = pochta[0]
        if pochta['isTemporaryClosed']:
            return 1 
        count += 1
        phones = ''
        for phone in pochta['phones']:
            if phones == '':
                phones = phones + '('+phone['phoneTownCode']+')'+phone['phoneNumber']
            else:
                phones = phones + ' ,('+phone['phoneTownCode']+')'+phone['phoneNumber']
        
        work = ['','','','','','','']
        if 'workingHours' in pochta:
            for item in pochta["workingHours"]:
                if 'beginWorkTime' in item:
                    work[item["weekDayId"]-1] = str(item['beginWorkTime'][:5])+'-'+str(item['endWorkTime'][:5])
        
            dubles = ['0']

            for i in range(1,7):
                pr = False
                for j in range(len(dubles)):    
                    if work[i] == work[int(dubles[j][0])]:
                        dubles[j] = dubles[j]+str(i)
                        pr = True
                        break
                    
                if not pr:
                    dubles.append(str(i))
            wd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

            resgraph = ''
            ress = ''
            for ch in dubles:
                ts = ''
                for m in ch:
                    if ts == '':
                        ts = wd[int(m)]
                    else:
                        ts = ts + ','+wd[int(m)]
                ts = ts + ': '
            
                i = ch[0]
                wdt = work[int(i)]
                if wdt == "":
                    ts = ts + 'выходной'
                else:
                    ts = ts + str(wdt)

                if ress == '':
                    ress = ts
                else:
                    ress = ress+' '+ts
        else:
            ress = ''
        response = requests.get('https://lookpost.ru/SetData/GetGeoSearch/?search='+kode)
        otdel_name = ''
        if response.content:
            otdel = json.loads(response.content)
            otdel_name=(otdel[list(otdel)[0]]["3"][0]["2"])
        arrres = [str(count), str(kode), otdel_name, pochta['address']['fullAddress'], phones, ress, pochta["latitude"], pochta["longitude"]]
        f = open('1.csv','a+')
        for i in arrres:
            f.write(str(i)+';')
        f.write('\n')
        f.close()





for g in range(100000, 992299):
    functt(g)
    




