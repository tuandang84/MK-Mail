import { ComponentRegistry, WorkspaceStore } from 'mailspring-exports';
import { OutlookGlobalRibbonApp } from './outlook-ribbon';

export function activate() {
  if (!AppEnv.isMainWindow()) {
    return;
  }
  ComponentRegistry.register(OutlookGlobalRibbonApp, {
    location: WorkspaceStore.Sheet.Global.Toolbar.Left,
  });
}

export function deactivate() {
  ComponentRegistry.unregister(OutlookGlobalRibbonApp);
}
