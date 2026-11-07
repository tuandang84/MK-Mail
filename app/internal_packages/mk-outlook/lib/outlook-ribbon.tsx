import React from 'react';
import { RetinaImg } from 'mailspring-component-kit';
import {
  localized,
  Actions,
  TaskFactory,
  FocusedContentStore,
  FocusedPerspectiveStore,
  Thread as ThreadType,
  Rx,
} from 'mailspring-exports';
import { ListensToObservable } from 'mailspring-component-kit';

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
      tabIndex={0}
      disabled={props.disabled}
      className={`mk-ribbon-btn${props.primary ? ' mk-ribbon-btn-primary' : ''}`}
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
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

function RibbonSearch() {
  const [value, setValue] = React.useState('');
  const submit = () => {
    Actions.searchQuerySubmitted(value.trim());
  };
  return (
    <div className="mk-ribbon-search">
      <span className="mk-ribbon-search-icon">🔍</span>
      <input
        tabIndex={0}
        className="mk-ribbon-search-input"
        placeholder={localized('Search mail')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setValue('');
            Actions.searchQuerySubmitted('');
          }
        }}
      />
      {value && (
        <button
          type="button"
          className="mk-ribbon-search-clear"
          title={localized('Clear')}
          onClick={() => {
            setValue('');
            Actions.searchQuerySubmitted('');
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

const TABS = ['File', 'Home', 'View', 'Help'] as const;

// Single full-width Outlook Classic ribbon.
export class OutlookGlobalRibbon extends React.Component<Props, { tab: string }> {
  static displayName = 'OutlookGlobalRibbon';
  state = { tab: 'Home' };
  render() {
    const { tab } = this.state;
    const items = this.props.items || [];
    const hasSelection = items.length > 0;
    const first: any = items[0];
    return (
      <div className="mk-ribbon-wrap">
        <div className="mk-ribbon-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              tabIndex={0}
              className={`mk-ribbon-tab${t === tab ? ' mk-ribbon-tab-active' : ''}`}
              onClick={() => this.setState({ tab: t })}
            >
              {t === 'File'
                ? localized('File')
                : t === 'Home'
                  ? localized('Home')
                  : t === 'View'
                    ? localized('View')
                    : localized('Help')}
            </button>
          ))}
          <div className="mk-ribbon-tabs-spacer" />
          <span className="mk-ribbon-title">{localized('MK-Mail — Classic')}</span>
        </div>
        {tab === 'Home' && (
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
                onClick={() =>
                  first && Actions.composeReply({ threadId: first.id, all: true } as any)
                }
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
              <RibbonButton
                icon="toolbar-markasread.png"
                label={localized('Mark Read')}
                disabled={!hasSelection}
                onClick={() => archive(items)}
              />
            </RibbonGroup>
            <div className="mk-ribbon-spacer" />
            <div className="mk-ribbon-search-wrap">
              <RibbonSearch />
            </div>
            <RibbonGroup title={localized('View')}>
              <RibbonButton
                icon="toolbar-print.png"
                label={localized('Print')}
                disabled={!hasSelection}
                onClick={() => window.print()}
              />
            </RibbonGroup>
          </div>
        )}
        {tab !== 'Home' && (
          <div className="mk-ribbon mk-ribbon-empty">
            <span className="mk-ribbon-empty-note">
              {tab === 'File'
                ? localized(
                    'File menu — New / Open / Save / Print / Exit are in the app menu (top-left).'
                  )
                : tab === 'View'
                  ? localized('View — Reading Pane / Folder Pane toggles are in Preferences.')
                  : localized('Help — see Preferences and the MK-Mail Release notes.')}
            </span>
          </div>
        )}
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

export const OutlookGlobalRibbonApp: any = ListensToObservable(OutlookGlobalRibbon, {
  getObservable: collectionObservable,
  getStateFromObservable: getState,
});
OutlookGlobalRibbonApp.displayName = 'OutlookGlobalRibbon';
