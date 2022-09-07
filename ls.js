var clc = require("cli-color");
const { runScript } = require('./rs');


function getServiceList(name) {
//  return runScript('systemctl --type=service | grep pm2d')
  return runScript('ls /etc/systemd/system')
    .then(res => {
//      return res.lines.join('').split('\n').map(i=>i.trim()).map(i=>i.split(' ')[0]).filter(i=>i!=='EXIT')
      let r = res.lines.join('').split('\n').filter(i=>i.indexOf('EXIT')!==0)
//console.log(r);
      return r.filter(i=>(name ? i.indexOf(name)!==-1 : true));
    })
}


function formatL( s, len) {
  s = '' + (s || '');
  if (s.length > len) s = s.substring(0, len-1) +  '\u0324';
  if (s.length < len) s = s + Array(len+1-s.length).join(' ');
  return s;
}


function print(result) {
  let header=clc.blackBright(`┌──────────────────────┬──────────┬────────┬───────────┬───────────┬──────────┬──────────┬──────────┐\n`)+
             clc.blackBright(`│ `+clc.cyanBright(`name`)+`                 │ `+clc.cyanBright(`pid`)+`      │ `+clc.cyanBright(`uptime`)+` │ `+clc.cyanBright(`status`)+`    │ `+clc.cyanBright(`startup`)+`   │ `+clc.cyanBright(`%cpu`)+`     │ `+clc.cyanBright(`mem`)+`      │ `+clc.cyanBright(`user`)+`     │\n`)+
             clc.blackBright(`├──────────────────────┼──────────┼────────┼───────────┼───────────┼──────────┼──────────┼──────────┤`);


  let footer = clc.blackBright(`└──────────────────────┴──────────┴────────┴───────────┴───────────┴──────────┴──────────┴──────────┘`);

  console.log(header);
  result.map( line => {
    let { name='', pid='', uptime='', active='', enabled='', memory='', user='', cpu='' } = line;
    name = formatL( name, 20);
    pid  = formatL( pid, 8); 
    uptime  = formatL( uptime.replace(' days', 'D').replace(' day', 'D').replace('min', 'm').replace(' weeks', 'W'), 6);
    let status = active==='active' ? clc.green('active   ') : clc.red(formatL(active, 9));
    enabled = enabled==='enabled' ? clc.green('enabled  ') : enabled.trim().length===0 ? clc.red(formatL('?', 9)) : clc.red(formatL(enabled, 9));
    let mem = formatL( memory.replace('M', 'mb'), 8);
    user = formatL(user, 8);
    cpu = formatL(cpu, 8);

    if (active!=='active') pid = clc.red(pid);
    if (active!=='active') uptime = clc.red(uptime);

    let bb = clc.blackBright('│');
    console.log(`${bb} ${name} ${bb} ${pid} ${bb} ${uptime} ${bb} ${status} ${bb} ${enabled} ${bb} ${cpu} ${bb} ${mem} ${bb} ${user} ${bb}`);
  })
  console.log(footer);
}


function processLines(lines) {
        lines = lines.join('').split('\n')
        let ret = {}
        lines.forEach(line => {
          let p = line.indexOf(':');
          if (p !== -1) {
            ret[line.substring(0, p).trim()] = line.substring(p+1, line.length).trim();
          }
        })

        let r = {}
        r.name = (lines[0].split('.')[0].split(' ')[1] || '').replace('pm2d-', '').trim();
        r.description = (lines[0].split('PM2D')[1] || '').trim();
        r.active = (ret.Active || '').split(' ')[0];
        r.enabled = ((ret.Loaded || '').split(';')[1] || '').trim();
        r.uptime = ((ret.Active || '').split(';')[1] || '').replace('ago', '').trim();
        r.pid = (ret['Main PID'] || ret['Process'] || '').split(' ')[0];
        r.memory = ret['Memory'] || '';
        r.user = '';
        r.Loaded = ret.Loaded;

        return r;
}


function ls(name) {
  getServiceList(name)
  .then(res => {
//    console.log(res)
  
    let result = [];
    let r = Promise.resolve();

    res.forEach( serviceName => {
      r = r.then(() => {
        return runScript(`systemctl status ${serviceName}`)
        .then(res => {
//    console.log(res)
          let r = processLines(res.lines);
          if (typeof r.Loaded !== 'undefined') result.push(r);

          return runScript(`ps -o user= -p ${r.pid}`)
          .then(res => {
            r.user = res.lines.join('').split('\n')[0];

            return runScript(`ps -p ${r.pid} -o %cpu`)
            .then(res => {
              r.cpu = (res.lines.join('').split('\n')[1] || '').trim();
            })
          })
          .catch(err => {})
        })
        .catch(res => {
//    console.log(res)
          let r = processLines(res.lines);
          if (typeof r.Loaded !== 'undefined') result.push(r);
        });
      })
    })

    r.then(()=>{
      print(result);
    })
  })
  .catch(err => console.log('ERROR', err));
}


module.exports = ls;