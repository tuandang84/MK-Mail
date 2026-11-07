import React from 'react';
import { RetinaImg, ListensToObservable } from 'mailspring-component-kit';
import {
  localized,
  Actions,
  TaskFactory,
  FocusedContentStore,
  FocusedPerspectiveStore,
  Thread as ThreadType,
  Rx,
} from 'mailspring-exports';

type Props = { items?: ThreadType[] };

function RibbonButton(props: {
  icon: string;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      tabIndex={-1}
      className={`mk-ribbon-btn${props.primary ? ' mk-ribbon-btn-primary' : ''}${props.disabled ? ' mk-ribbon-btn-disabled' : ''}`}
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <RetinaImg name={props.icon} mode={RetinaImg.Mode.ContentIsMask} aria-hidden="true" />
      <span className="mk-ribbon-label">{props.label}</span>
    </button>
  );
}

function RibbonGroup(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mk-ribbon-group">
      <div className="mk-ribbon-buttons">{props.children}</div>
      <div className="mk-ribbon-group-label">{props.title}</div>
    </div>
  );
}

function archive(threads: ThreadType[]) {
  if (!threads.length) return;
  const tasks = TaskFactory.tasksForArchiving({
    threads,
    source: 'Outlook Ribbon',
    perspective: FocusedPerspectiveStore.current(),
  });
  Actions.queueTasks(tasks);
  Actions.popSheet();
}
function trash(threads: ThreadType[]) {
  if (!threads.length) return;
  const tasks = TaskFactory.tasksForMovingToTrash({ threads, source: 'Outlook Ribbon' });
  Actions.queueTasks(tasks);
  Actions.popSheet();
}

// Folder pane ribbon (RootSidebar): big New Mail like Outlook Classic.
export class OutlookHomeRibbon extends React.Component {
  static displayName = 'OutlookHomeRibbon';
  render() {
    return (
      <div className="mk-ribbon mk-ribbon-home">
        <RibbonGroup title={localized('New')}>
          <RibbonButton
            icon="toolbar-compose.png"
            label={localized('New Mail')}
            primary
            onClick={() => Actions.composeNewBlankDraft()}
          />
        </RibbonGroup>
        <div className="mk-ribbon-separator" />
        <RibbonGroup title={localized('Home')}>
          <RibbonButton
            icon="toolbar-compose.png"
            label={localized('New Mail')}
            onClick={() => Actions.composeNewBlankDraft()}
          />
        </RibbonGroup>
      </div>
    );
  }
}

// Thread list ribbon (Outlook Home tab).
export class OutlookThreadRibbon extends React.Component<Props> {
  static displayName = 'OutlookThreadRibbon';
  render() {
    const items = this.props.items || [];
    const hasSelection = items.length > 0;
    const first: any = items[0];
    return (
      <div className="mk-ribbon">
        <RibbonGroup title={localized('New')}>
          <RibbonButton
            icon="toolbar-compose.png"
            label={localized('New Mail')}
            primary
            onClick={() => Actions.composeNewBlankDraft()}
          />
        </RibbonGroup>
        <div className="mk-ribbon-separator" />
        <RibbonGroup title={localized('Respond')}>
          <RibbonButton
            icon="toolbar-reply.png"
            label={localized('Reply')}
            disabled={!hasSelection}
            onClick={() => first && Actions.composeReply({ threadId: first.id })}
          />
          <RibbonButton
            icon="toolbar-reply-all.png"
            label={localized('Reply All')}
            disabled={!hasSelection}
            onClick={() => first && Actions.composeReply({ threadId: first.id, all: true } as any)}
          />
          <RibbonButton
            icon="toolbar-forward.png"
            label={localized('Forward')}
            disabled={!hasSelection}
            onClick={() => first && Actions.composeForward({ threadId: first.id } as any)}
          />
        </RibbonGroup>
        <div className="mk-ribbon-separator" />
        <RibbonGroup title={localized('Delete')}>
          <RibbonButton
            icon="toolbar-trash.png"
            label={localized('Delete')}
            disabled={!hasSelection}
            onClick={() => trash(items)}
          />
          <RibbonButton
            icon="toolbar-archive.png"
            label={localized('Archive')}
            disabled={!hasSelection}
            onClick={() => archive(items)}
          />
          <RibbonButton
            icon="toolbar-spam.png"
            label={localized('Junk')}
            disabled={!hasSelection}
            onClick={() => {
              if (!items.length) return;
              const tasks = TaskFactory.tasksForMarkingAsSpam({
                threads: items,
                source: 'Outlook Ribbon',
              });
              Actions.queueTasks(tasks as any);
              Actions.popSheet();
            }}
          />
        </RibbonGroup>
        <div className="mk-ribbon-separator" />
        <RibbonGroup title={localized('Move')}>
          <RibbonButton
            icon="toolbar-movetofolder.png"
            label={localized('Move to')}
            disabled={!hasSelection}
            onClick={() => archive(items)}
          />
        </RibbonGroup>
      </div>
    );
  }
}

// Reading pane ribbon.
export class OutlookMessageRibbon extends React.Component<Props> {
  static displayName = 'OutlookMessageRibbon';
  render() {
    const items = this.props.items || [];
    const hasSelection = items.length > 0;
    const first: any = items[0];
    return (
      <div className="mk-ribbon">
        <RibbonGroup title={localized('Respond')}>
          <RibbonButton
            icon="toolbar-reply.png"
            label={localized('Reply')}
            disabled={!hasSelection}
            onClick={() => first && Actions.composeReply({ threadId: first.id })}
          />
          <RibbonButton
            icon="toolbar-forward.png"
            label={localized('Forward')}
            disabled={!hasSelection}
            onClick={() => first && Actions.composeForward({ threadId: first.id } as any)}
          />
        </RibbonGroup>
        <div className="mk-ribbon-separator" />
        <RibbonGroup title={localized('Actions')}>
          <RibbonButton
            icon="toolbar-trash.png"
            label={localized('Delete')}
            disabled={!hasSelection}
            onClick={() => trash(items)}
          />
          <RibbonButton
            icon="toolbar-archive.png"
            label={localized('Archive')}
            disabled={!hasSelection}
            onClick={() => archive(items)}
          />
          <RibbonButton
            icon="toolbar-print.png"
            label={localized('Print')}
            disabled={!hasSelection}
            onClick={() => window.print()}
          />
        </RibbonGroup>
      </div>
    );
  }
}

function collectionObservable() {
  return Rx.Observable.fromStore(FocusedContentStore).map((store: any) => {
    const f = store.focused('thread');
    return f ? [f] : [];
  });
}

function getState(items: ThreadType[]) {
  return { items: items || [] };
}

export const OutlookThreadRibbonApp: any = ListensToObservable(OutlookThreadRibbon, {
  getObservable: collectionObservable,
  getStateFromObservable: getState,
});
OutlookThreadRibbonApp.displayName = 'OutlookThreadRibbon';

export const OutlookMessageRibbonApp: any = ListensToObservable(OutlookMessageRibbon, {
  getObservable: collectionObservable,
  getStateFromObservable: getState,
});
OutlookMessageRibbonApp.displayName = 'OutlookMessageRibbon';
