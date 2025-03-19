/**
 * Componente per il rendering di testo tradotto
 * Utilizza il servizio i18n per recuperare il testo nella lingua corrente
 */
import React from 'react';
import { useTranslation } from '../services/i18n-service.js';

/**
 * Componente che renderizza un testo tradotto
 * 
 * @param {object} props - Proprietà del componente
 * @param {string} props.i18nKey - Chiave di traduzione nel formato 'namespace.key'
 * @param {object} [props.params] - Parametri opzionali per la sostituzione nel testo tradotto
 * @param {string} [props.className] - Classe CSS opzionale
 * @param {string} [props.tag] - Tag HTML da utilizzare (default: span)
 */
const TranslatedText = ({ 
  i18nKey, 
  params,
  className = '',
  tag: Tag = 'span'
}) => {
  const { t } = useTranslation();
  
  return (
    <Tag className={className}>
      {t(i18nKey, params)}
    </Tag>
  );
};

export default TranslatedText;
