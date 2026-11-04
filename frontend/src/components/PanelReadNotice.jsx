import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { READ_RESULT_EVENT } from '../services/apiClient';
/** A missing response is not an empty registry. Retain read failures until recovery or navigation. */
export default function PanelReadNotice() {
  const { pathname } = useLocation();
  const [failures, setFailures] = useState({});
  useEffect(() => {
    setFailures({});
    const receive = ({ detail }) => {
      if (detail?.page !== pathname) return;
      setFailures(old => {
        const next = { ...old };
        if (detail.message) next[detail.key] = detail.message;
        else delete next[detail.key];
        return next;
      });
    };
    window.addEventListener(READ_RESULT_EVENT, receive);
    return () => window.removeEventListener(READ_RESULT_EVENT, receive);
  }, [pathname]);
  const messages = [...new Set(Object.values(failures))];
  return messages.length ? <div className="alert alert-warning my-3" role="alert">
    <strong>Não foi possível carregar todas as informações.</strong>
    {messages.map(message => <div key={message}>{message}</div>)}
    <small>Os dados podem estar incompletos. Use a opção de atualizar da tela ou reabra esta página para tentar novamente.</small>
  </div> : null;
}
