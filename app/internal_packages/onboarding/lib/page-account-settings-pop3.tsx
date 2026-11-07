import { ipcRenderer } from 'electron';
import React from 'react';
import { localized, Account } from 'mailspring-exports';
import CreatePageForForm from './decorators/create-page-for-form';
import FormField from './form-field';
import { serversOutsideDomain } from './onboarding-helpers';

const StandardPOP3Ports = [110, 995];
const StandardSMTPPorts = [25, 465, 587];

interface AccountPOP3SettingsFormProps {
  account: Account;
  errorFieldNames: string[];
  submitting: boolean;
  onConnect: () => void;
  onFieldChange: (
    event: { target: { id: string; value: any; type?: string; checked?: boolean } },
    opts?: { afterSetState: () => void }
  ) => void;
  onFieldKeyPress: () => void;
}

export class AccountPOP3SettingsForm extends React.Component<AccountPOP3SettingsFormProps> {
  static displayName = 'AccountPOP3SettingsForm';

  static submitLabel = () => {
    return localized('Connect Account');
  };

  static titleLabel = () => {
    return localized('Set up Account');
  };

  static subtitleLabel = () => {
    return localized('Specify your POP3 and SMTP connection settings.');
  };

  // Required by CreatePageForForm. Without this the decorator throws
  // "FormComponent.validateAccount is not a function" in its constructor
  // and the whole window goes white/frozen as soon as POP3 is picked.
  static validateAccount = (account: Account) => {
    const errorFieldNames: string[] = [];
    let errorMessage: string | null = null;
    const settings = (account.settings || {}) as Record<string, any>;

    // Basic identity fields (the POP3 page is reached directly from the
    // provider picker, not via the generic basic form).
    if (!account.emailAddress || !account.name) {
      return { errorMessage, errorFieldNames, populated: false };
    }

    // POP3 username defaults to the email address in the sync engine, but
    // the password is mandatory. SMTP auth is optional on some gateways.
    if (!settings.pop3_password) {
      return { errorMessage, errorFieldNames, populated: false };
    }

    for (const type of ['pop3', 'smtp']) {
      if (!settings[`${type}_host`]) {
        return { errorMessage, errorFieldNames, populated: false };
      }
      const port = settings[`${type}_port`];
      // Ports may arrive as strings from <input type="number">. 0 is the
      // "Custom" placeholder value in the dropdown, not a real port.
      if (
        port === undefined ||
        port === null ||
        port === '' ||
        !Number.isFinite(Number(port)) ||
        Number(port) <= 0
      ) {
        errorMessage = localized('Please provide a valid port number.');
        errorFieldNames.push(`settings.${type}_port`);
      }
    }

    // Non-empty email is already guaranteed above; still flag malformed ones
    // so the user gets feedback instead of a server-side auth failure.
    if (account.emailAddress && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account.emailAddress)) {
      errorMessage = localized('Please provide a valid email address.');
      errorFieldNames.push('emailAddress');
    }

    return { errorMessage, errorFieldNames, populated: true };
  };

  componentDidMount() {
    ipcRenderer.send('resize-window', { width: 900, height: 660 });
    const { account, onFieldChange } = this.props;
    const settings = (account.settings || {}) as Record<string, any>;

    // Set default POP3/SMTP settings if empty. They must be applied in
    // sequence via afterSetState: calling onFieldChange repeatedly in a
    // loop would clone the *same* stale state each time and every default
    // but the last one would be lost (and the UI would flicker/freeze).
    const defaults: Array<{ id: string; value: any }> = [];
    if (!settings.pop3_port) defaults.push({ id: 'settings.pop3_port', value: 995 });
    if (!settings.pop3_security)
      defaults.push({ id: 'settings.pop3_security', value: 'SSL / TLS' });
    if (!settings.smtp_port) defaults.push({ id: 'settings.smtp_port', value: 587 });
    if (!settings.smtp_security) defaults.push({ id: 'settings.smtp_security', value: 'STARTTLS' });
    if (!settings.pop3_username && account.emailAddress)
      defaults.push({ id: 'settings.pop3_username', value: account.emailAddress });
    if (!settings.smtp_username && account.emailAddress)
      defaults.push({ id: 'settings.smtp_username', value: account.emailAddress });

    const applyNext = (index: number) => {
      if (index >= defaults.length) return;
      const d = defaults[index];
      onFieldChange(
        { target: { id: d.id, value: d.value } },
        { afterSetState: () => applyNext(index + 1) }
      );
    };
    applyNext(0);
  }

  renderConnectionSection(protocol: 'pop3' | 'smtp') {
    const {
      account: { settings },
      submitting,
      onFieldKeyPress,
      onFieldChange,
    } = this.props;

    const field = `${protocol}_port`;
    const values = protocol === 'pop3' ? StandardPOP3Ports : StandardSMTPPorts;
    const isStandard = Number.isInteger(settings[field]) && values.includes(settings[field]);
    const customValue = isStandard ? '0' : settings[field];

    const onPortChange = (event: { target: { value: string; id: string } }) => {
      const port = Number(event.target.value);

      onFieldChange(
        { target: { value: port, id: event.target.id } },
        {
          afterSetState: () => {
            if (protocol === 'pop3') {
              if (port === 110 && settings.pop3_security !== 'none') {
                onFieldChange({ target: { value: 'none', id: 'settings.pop3_security' } });
              }
              if (port === 995 && settings.pop3_security !== 'SSL / TLS') {
                onFieldChange({ target: { value: 'SSL / TLS', id: 'settings.pop3_security' } });
              }
            } else {
              if (port === 465 && settings.smtp_security !== 'SSL / TLS') {
                onFieldChange({ target: { value: 'SSL / TLS', id: 'settings.smtp_security' } });
              }
              if ((port === 587 || port === 25) && settings.smtp_security !== 'STARTTLS') {
                onFieldChange({ target: { value: 'STARTTLS', id: 'settings.smtp_security' } });
              }
            }
          },
        }
      );
    };

    return (
      <div className="section">
        <span className="section-title">
          {protocol === 'pop3'
            ? localized('Incoming Mail (POP3)')
            : localized('Outgoing Mail (SMTP)')}
        </span>
        <FormField
          field={`settings.${protocol}_host`}
          title={localized('Server')}
          {...this.props}
        />
        <span>
          <label htmlFor={`settings.${field}`}>{localized('Port')}:</label>
          <select
            id={`settings.${field}`}
            tabIndex={0}
            value={isStandard ? settings[field] : 0}
            disabled={submitting}
            onKeyPress={onFieldKeyPress}
            onChange={onPortChange}
          >
            {values.map((v) => (
              <option value={v} key={v}>
                {v}
              </option>
            ))}
            <option value={0} key="custom">
              {localized('Custom')}
            </option>
          </select>
        </span>
        {!isStandard && (
          <FormField
            field={`settings.${protocol}_port`}
            title={localized('Custom Port')}
            type="number"
            {...this.props}
          />
        )}
        <span style={{ paddingLeft: '20px' }}>
          <select
            id={`settings.${protocol}_security`}
            tabIndex={0}
            value={
              settings[`${protocol}_security`] || (protocol === 'pop3' ? 'SSL / TLS' : 'STARTTLS')
            }
            disabled={submitting}
            onKeyPress={onFieldKeyPress}
            onChange={onFieldChange}
          >
            <option value="SSL / TLS" key="SSL / TLS">
              SSL / TLS
            </option>
            <option value="STARTTLS" key="STARTTLS">
              STARTTLS
            </option>
            <option value="none" key="none">
              {localized('None')}
            </option>
          </select>
        </span>
        <span style={{ paddingLeft: '20px', paddingTop: '10px' }}>
          <input
            type="checkbox"
            id={`settings.${protocol}_allow_insecure_ssl`}
            disabled={submitting}
            checked={settings[`${protocol}_allow_insecure_ssl`] || false}
            onKeyPress={onFieldKeyPress}
            onChange={onFieldChange}
          />
          <label htmlFor={`settings.${protocol}_allow_insecure_ssl`}>
            {localized('Allow insecure SSL')}
          </label>
        </span>
        <FormField
          field={`settings.${protocol}_username`}
          title={localized('Username')}
          {...this.props}
        />
        <FormField
          field={`settings.${protocol}_password`}
          title={localized('Password')}
          type="password"
          {...this.props}
        />
      </div>
    );
  }

  render() {
    const { account } = this.props;
    const warning = serversOutsideDomain(account);

    return (
      <form className="settings-imap">
        <FormField field="name" title={localized('Name')} {...this.props} />
        <FormField field="emailAddress" title={localized('Email')} {...this.props} />
        {this.renderConnectionSection('pop3')}
        {this.renderConnectionSection('smtp')}
        {warning && (
          <div className="warning-callout" style={{ margin: '15px 0' }}>
            {warning}
          </div>
        )}
      </form>
    );
  }
}

export default CreatePageForForm(AccountPOP3SettingsForm);
