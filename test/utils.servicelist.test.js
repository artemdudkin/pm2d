const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_1 = `UNIT                                   LOAD      ACTIVE     SUB          DESCRIPTION                                                       
  cpupower.service                       loaded    inactive   dead         Configure CPU power related settings                              
  crond.service                          loaded    active     running      Command Scheduler                                                 
● display-manager.service                not-found inactive   dead         display-manager.service                                           

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.

126 loaded units listed.
To show all installed unit files use 'systemctl list-unit-files'.`



describe("#utils.servicelist", function () {

  it("[linux] getCurrentUser", function () {
    const { getCurrentUser } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => Promise.resolve( {lines: ['xyz\nEXIT 0']})},
    });

    return getCurrentUser()
    .then(res => {
      expect(res).to.equal('xyz')
    })
  });


  it("[linux] getServiceList", function () {
    let commands = []
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})
        }
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['whoami', 'systemctl  list-units --type=service --all'])
      expect(res).to.deep.equal(['cpupower.service', 'crond.service'])
    })
  });


  it("[linux] getServiceList with filter", function () {
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})},
    });

    return getServiceList('cpu')
    .then(res => {
      expect(res).to.deep.equal(['cpupower.service'])
    })
  });


  it("[linux] getServiceList (non-root)", function () {
    let commands = []
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'xyz':ret_1)]})
        }
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['whoami', 'systemctl --user list-units --type=service --all'])
    })
  });


});