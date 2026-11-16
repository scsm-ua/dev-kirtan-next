export type TFeedbackTranslations = {
  TRIGGER_TEXT: string;
  OFFLINE: string;
  DELIVERY_ERROR: string;
  TITLE: string;
  TU_MESSAGE: string;
  APPEAL: string;
  FIELDS: {
    NAME: {
      LABEL: string;
      VALIDATION: {
        MAX_LENGTH: string;
      };
    };
    EMAIL: {
      LABEL: string;
      VALIDATION: {
        INVALID: string;
      };
    };
    MESSAGE: {
      LABEL: string;
      PLACEHOLDER: string;
      VALIDATION: {
        MAX_LENGTH: string;
        MIN_LENGTH: string;
      };
    };
    IMAGE: {
      VALIDATION: {
        TYPE: string;
        SIZE: string;
      };
      TEXT: string;
      SUBTEXT: string;
    };
    SUBMIT: string;
  };
};
