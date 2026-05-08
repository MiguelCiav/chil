export const config = {
  runner: 'local',
  specs: [
    './test/specs/**/*.ts'
  ],
  exclude: [],
  maxInstances: 1,
  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: './src-tauri/target/debug/chil'
    }
  }],
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost:1420',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
  port: 4444
};
