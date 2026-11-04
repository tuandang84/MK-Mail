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

class AccountPOP3SettingsForm extends React.Component<AccountPOP3SettingsFormProps> {
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

  componentDidMount() {
    const { account, onFieldChange } = this.props;
    const { settings = {} } = account;

    // Set default POP3/SMTP settings if empty
    if (!settings.pop3_port) {
      onFieldChange({ target: { id: 'settings.pop3_port', value: 995 } });
    }
    if (!settings.pop3_security) {
      onFieldChange({ target: { id: 'settings.pop3_security', value: 'SSL / TLS' } });
    }
    if (!settings.smtp_port) {
      onFieldChange({ target: { id: 'settings.smtp_port', value: 587 } });
    }
    if (!settings.smtp_security) {
      onFieldChange({ target: { id: 'settings.smtp_security', value: 'STARTTLS' } });
    }
    if (!settings.pop3_username && account.emailAddress) {
      onFieldChange({ target: { id: 'settings.pop3_username', value: account.emailAddress } });
    }
    if (!settings.smtp_username && account.emailAddress) {
      onFieldChange({ target: { id: 'settings.smtp_username', value: account.emailAddress } });
    }
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
          {protocol === 'pop3' ? localized('Incoming Mail (POP3)') : localized('Outgoing Mail (SMTP)')}
        </span>
        <FormField field={`settings.${protocol}_host`} title={localized('Server')} {...this.props} />
        <FormField
          field={`settings.${protocol}_port`}
          title={localized('Port')}
          type="select"
          onChange={onPortChange}
          values={[
            ...values.map((v) => ({ label: `${v}`, value: v })),
            { label: localized('Custom'), value: '0' },
          ]}
          {...this.props}
        />
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
            value={settings[`${protocol}_security`] || (protocol === 'pop3' ? 'SSL / TLS' : 'STARTTLS')}
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
