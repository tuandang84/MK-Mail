import { ComponentRegistry, WorkspaceStore } from 'mailspring-exports';
import {
  OutlookHomeRibbon,
  OutlookThreadRibbonApp,
  OutlookMessageRibbonApp,
} from './outlook-ribbon';

export function activate() {
  if (!AppEnv.isMainWindow()) {
    return;
  }
  ComponentRegistry.register(OutlookHomeRibbon, {
    location: WorkspaceStore.Location.RootSidebar.Toolbar,
  });
  ComponentRegistry.register(OutlookThreadRibbonApp, {
    location: WorkspaceStore.Location.ThreadList.Toolbar,
    modes: ['list', 'split'],
  });
  ComponentRegistry.register(OutlookMessageRibbonApp, {
    location: WorkspaceStore.Location.MessageList.Toolbar,
    modes: ['list', 'split'],
  });
}

export function deactivate() {
  ComponentRegistry.unregister(OutlookHomeRibbon);
  ComponentRegistry.unregister(OutlookThreadRibbonApp);
  ComponentRegistry.unregister(OutlookMessageRibbonApp);
}
