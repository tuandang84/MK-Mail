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
  | 'print'
  | 'folder'
  | 'info'
  | 'help'
  | 'settings'
  | 'grid'
  | 'search';

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
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  grid: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
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

function MoveToButton(props: { items: ThreadType[] }) {
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const onClick = () => {
    if (!props.items.length || !btnRef.current) return;
    const { CategoryStore, AccountStore, ChangeFolderTask } = require('mailspring-exports');
    const account = AccountStore.accountForItems(props.items);
    if (!account) return;
    const folders = CategoryStore.foldersForAccount(account.id).filter((f: any) => f.id);
    if (!folders.length) return;
    Actions.openPopover(
      React.createElement(
        'div',
        { className: 'category-picker-popover mk-move-popover' },
        folders.map((f: any) =>
          React.createElement(
            'button',
            {
              key: f.id,
              className: 'mk-move-item',
              onClick: () => {
                const tasks = TaskFactory.tasksForThreadsByAccountId(
                  props.items,
                  (accountThreads: any) => {
                    return new ChangeFolderTask({
                      folder: f,
                      threads: accountThreads,
                      source: 'Outlook Ribbon',
                    });
                  }
                );
                Actions.queueTasks(tasks as any);
                Actions.popSheet();
                Actions.closePopover();
              },
            },
            f.name
          )
        )
      ),
      { originRect: btnRef.current.getBoundingClientRect(), direction: 'down' }
    );
  };
  return (
    <button
      ref={btnRef}
      tabIndex={0}
      className="mk-ribbon-btn"
      title={localized('Move to')}
      aria-label={localized('Move to')}
      onClick={onClick}
    >
      <RibbonIcon name="move" />
      <span className="mk-ribbon-label">{localized('Move to')}</span>
    </button>
  );
}

function RibbonSearch() {
  const [value, setValue] = React.useState('');
  const submit = () => {
    Actions.searchQuerySubmitted(value.trim());
  };
  return (
    <div className="mk-ribbon-search">
      <RibbonIcon name="search" />
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

  _openPreferences = () => {
    (AppEnv as any).focus?.();
    Actions.openPreferences?.();
    // Fallback: dispatch the app's open-preferences command via the browser process.
    if (typeof (window as any).openPreferences === 'function') {
      (window as any).openPreferences();
    }
  };

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
              <MoveToButton items={items} />
              <RibbonButton
                icon="markRead"
                label={localized('Mark Read')}
                onClick={() => {
                  if (!items.length) return;
                  const tasks = TaskFactory.taskForSettingUnread({
                    threads: items,
                    unread: false,
                    source: 'Outlook Ribbon',
                  });
                  Actions.queueTasks(tasks as any);
                  Actions.popSheet();
                }}
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
        {tab === 'File' && (
          <div className="mk-ribbon">
            <RibbonGroup title={localized('Account')}>
              <RibbonButton
                icon="compose"
                label={localized('New Mail')}
                primary
                onClick={() => Actions.composeNewBlankDraft()}
              />
              <RibbonButton
                icon="folder"
                label={localized('Import')}
                onClick={() => {
                  const url = 'https://github.com/tuandang84/MK-Mail';
                  const { shell } = require('electron');
                  shell.openExternal(url);
                }}
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Info')}>
              <RibbonButton
                icon="info"
                label={localized('Info')}
                onClick={() => {
                  const { shell } = require('electron');
                  shell.openExternal('https://github.com/tuandang84/MK-Mail');
                }}
              />
              <RibbonButton
                icon="settings"
                label={localized('Settings')}
                onClick={() =>
                  (require('@electron/remote') as any)
                    .getCurrentWindow()
                    ?.webContents?.send?.('open-preferences')
                }
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Close')}>
              <RibbonButton
                icon="print"
                label={localized('Print')}
                onClick={() => window.print()}
              />
              <RibbonButton
                icon="trash"
                label={localized('Close')}
                onClick={() => {
                  const { app } = require('electron');
                  app.quit();
                }}
              />
            </RibbonGroup>
          </div>
        )}
        {tab === 'View' && (
          <div className="mk-ribbon">
            <RibbonGroup title={localized('Layout')}>
              <RibbonButton
                icon="grid"
                label={localized('Reading Pane')}
                onClick={() => {
                  this.setState({ tab: 'Home' });
                }}
              />
              <RibbonButton
                icon="folder"
                label={localized('Folder Pane')}
                onClick={() => {
                  this.setState({ tab: 'Home' });
                }}
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Show')}>
              <RibbonButton
                icon="search"
                label={localized('Search')}
                onClick={() => {
                  (document.querySelector('.mk-ribbon-search-input') as any)?.focus();
                }}
              />
              <RibbonButton
                icon="print"
                label={localized('Print')}
                onClick={() => window.print()}
              />
            </RibbonGroup>
          </div>
        )}
        {tab === 'Help' && (
          <div className="mk-ribbon">
            <RibbonGroup title={localized('Support')}>
              <RibbonButton
                icon="help"
                label={localized('Help')}
                onClick={() => {
                  const { shell } = require('electron');
                  shell.openExternal('https://github.com/tuandang84/MK-Mail');
                }}
              />
              <RibbonButton
                icon="info"
                label={localized('About')}
                onClick={() => {
                  const { dialog } = require('@electron/remote');
                  const { app } = require('electron');
                  dialog.showMessageBox({
                    message: `MK-Mail ${app.getVersion()}`,
                    detail: localized(
                      'MK-Mail — Classic Outlook-style client with POP3 & SMTP support.'
                    ),
                    buttons: ['OK'],
                  });
                }}
              />
            </RibbonGroup>
            <div className="mk-ribbon-separator" />
            <RibbonGroup title={localized('Feedback')}>
              <RibbonButton
                icon="folder"
                label={localized('Release')}
                onClick={() => {
                  const { shell } = require('electron');
                  shell.openExternal('https://github.com/tuandang84/MK-Mail/releases');
                }}
              />
            </RibbonGroup>
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
