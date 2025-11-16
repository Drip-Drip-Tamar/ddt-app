import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'i1ywpsq5',
    dataset: 'production'
  },
  studioHost: 'ddt-app',
  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  deployment: {
    autoUpdates: true,
    appId: 'bzjl9avm02knmjthpyml3mok'
  }
})
