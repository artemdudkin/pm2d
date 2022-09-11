const os = require('os');
const { runScript } = require('./rs');


function formatL( s, len) {
  s = '' + (s || '');
  if (s.length > len) s = s.substring(0, len-1) +  '\u0324';
  if (s.length < len) s = s + Array(len+1-s.length).join(' ');
  return s;
}


let currentUser;
async function getCurrentUser() {
  if (!currentUser) { // memoization of current user
    let whoami = await runScript('whoami');
    currentUser = whoami.lines.join('').split('\n')[0];
  } else {
  }
  return currentUser;
}


/**
 * Returns array of service names from /etc/systemd/system
 * (also filter by name if any)
 */
function getSystemServiceList(name) {
  return runScript('ls /etc/systemd/system')
    .then(res => {
      let r = res.lines.join('').split('\n').filter(i=>i.indexOf('EXIT')!==0)

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort();
    })
}


/**
 * Returns array of service names from 'systemctl list-unit-files'
 * (also filter by name if any)
 */
async function getServiceList(name) {
  let currentUser = await getCurrentUser();

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} list-unit-files --type=service`)
    .then(res => {
//console.log('res', res);
      let r = res.lines.join('')
                       .split('\n')
                       .filter(i=>i.indexOf('EXIT')!==0 && i.indexOf('UNIT')!==0 && i.indexOf('files listed.')===-1 )
                       .filter(i=>{
                         let type = i.substring(i.indexOf(' '), i.length).trim();
                         return type !=='static' && type !== ''
                       })
                       .map(i=>i.split(' ')[0].trim())

      return r.filter(i=>i.indexOf('.service')!==-1)
              .filter(i=>(name ? i.indexOf(name)!==-1 : true))
              .sort();
    })
}


function getScriptFolder(user) {
 return ( user === 'root' ? '/usr/sbin/' : `${os.homedir()}/bin/`);
}

function getLogFolder(user) {
  return (user === 'root' ? '/var/log/' : `${os.homedir()}/log/`);
}

function getServiceFolder(user) {
  return (user === 'root' ? '/etc/systemd/system/' : `${os.homedir()}/.config/systemd/user/`);
}



module.exports = {
  formatL,

  getCurrentUser,
  getServiceList,
  getSystemServiceList,

  getScriptFolder,
  getLogFolder,
  getServiceFolder
};