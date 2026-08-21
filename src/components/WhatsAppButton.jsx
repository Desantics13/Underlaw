import React from 'react';

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=573103184180&text&type=phone_number&app_absent=0';

const WhatsAppButton = () => {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
        zIndex: 999,
        transition: 'transform 0.25s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <svg viewBox="0 0 32 32" width="30" height="30" fill="#ffffff" aria-hidden="true">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.386.703 4.61 1.912 6.47L4 29l7.72-1.87A11.9 11.9 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.7c-1.94 0-3.79-.52-5.39-1.5l-.386-.23-4.58 1.11 1.13-4.47-.25-.4A9.66 9.66 0 0 1 6.3 15c0-5.36 4.35-9.7 9.704-9.7 5.353 0 9.7 4.34 9.7 9.7 0 5.36-4.347 9.7-9.7 9.7Zm5.32-7.26c-.29-.145-1.717-.847-1.983-.944-.267-.096-.462-.145-.656.146-.194.29-.752.943-.922 1.137-.17.194-.34.218-.63.073-.29-.146-1.222-.45-2.328-1.435-.86-.767-1.44-1.715-1.61-2.005-.17-.29-.018-.447.127-.59.13-.13.29-.34.435-.51.145-.17.194-.29.29-.484.097-.194.048-.363-.024-.508-.073-.145-.656-1.58-.9-2.165-.237-.57-.478-.492-.656-.5l-.56-.01c-.194 0-.508.073-.774.363-.267.29-1.017.994-1.017 2.423 0 1.43 1.04 2.81 1.185 3.005.145.194 2.05 3.13 4.966 4.39.694.3 1.235.48 1.657.615.696.222 1.33.19 1.83.115.558-.083 1.717-.702 1.96-1.38.243-.68.243-1.263.17-1.38-.073-.12-.267-.194-.557-.34Z"/>
      </svg>
    </a>
  );
};

export default WhatsAppButton;
