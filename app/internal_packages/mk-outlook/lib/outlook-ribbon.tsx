import React from 'react';
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

type IconName =
  | 'compose'
  | 'reply'
  | 'replyAll'
  | 'forward'
  | 'trash'
  | 'archive'
  | 'junk'
  | 'move'
  | 'markRead'
  | 'print';

// Lucide (https://lucide.dev) — MIT, widely used. Inline SVG so it works offline
// and stays crisp at 24px, unlike the old grayscale mask PNGs that faded.
const ICON_PATHS: Record<IconName, React.ReactNode> = {
  compose: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  reply: (
    <>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </>
  ),
  replyAll: (
    <>
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H6" />
    </>
  ),
  forward: (
    <>
      <polyline points="15 3 21 9 15 15" />
      <path d="M4 14v2a4 4 0 0 0 4 4h8" />
      <path d="M21 9H9a4 4 0 0 0-4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </>
  ),
  archive: (
    <>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>
  ),
  junk: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="20" y1="15" y2="15" />
    </>
  ),
  move: (
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="21 3 14 10" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </>
  ),
  markRead: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  print: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </>
  ),
};

function RibbonIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="mk-ribbon-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function RibbonButton(props: {
  icon: IconName;
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
      <RibbonIcon name={props.icon} />
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
    const first: any = items[0];
    return (
      <div className="mk-ribbon-wrap">
        <div className="mk-ribbon-tabs">
          <span className="mk-ribbon-app-title">MK-Mail</span>
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
        </div>
        {tab === 'Home' && (
          <div className="mk-ribbon">
            <RibbonGroup title={localized('New')}>
              <RibbonButton
                icon="compose"
                label={localized('New Mail')}
                primary
                onClick={() => Actions.composeNewBlankDraft()}
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Respond')}>
              <RibbonButton
                icon="reply"
                label={localized('Reply')}
                onClick={() =>
                  first &&
                  Actions.composeReply({
                    thread: first,
                    type: 'reply',
                    behavior: 'prefer-existing-if-pristine',
                  } as any)
                }
              />
              <RibbonButton
                icon="replyAll"
                label={localized('Reply All')}
                onClick={() =>
                  first &&
                  Actions.composeReply({
                    thread: first,
                    type: 'reply-all',
                    behavior: 'prefer-existing-if-pristine',
                  } as any)
                }
              />
              <RibbonButton
                icon="forward"
                label={localized('Forward')}
                onClick={() => first && Actions.composeForward({ thread: first } as any)}
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Delete')}>
              <RibbonButton icon="trash" label={localized('Delete')} onClick={() => trash(items)} />
              <RibbonButton
                icon="archive"
                label={localized('Archive')}
                onClick={() => archive(items)}
              />
              <RibbonButton
                icon="junk"
                label={localized('Junk')}
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
                icon="move"
                label={localized('Move to')}
                onClick={() => archive(items)}
              />
              <RibbonButton
                icon="markRead"
                label={localized('Mark Read')}
                onClick={() => archive(items)}
              />
            </RibbonGroup>
            <div className="mk-ribbon-spacer" />
            <div className="mk-ribbon-search-wrap">
              <RibbonSearch />
            </div>
            <RibbonGroup title={localized('View')}>
              <RibbonButton
                icon="print"
                label={localized('Print')}
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
