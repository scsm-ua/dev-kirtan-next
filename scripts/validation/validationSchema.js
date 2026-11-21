const TRANSLATION_VALIDATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'A_Z_PAGE',
    'AUDIO_PAGE',
    'AUTHORS_PAGE',
    'BOOK_LIST_PAGE',
    'FOOTER',
    'CONTENTS_PAGE',
    'NOT_FOUND_PAGE',
    'SEARCH_PAGE',
    'SONG_PAGE',
    'DISPLAY_MODE_MENU',
    // 'i18n',
    'META',
    'OFFLINE'
  ],
  properties: {
    A_Z_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['HEAD', 'SCHEMA', 'LINK_FULL_TITLE'],
      properties: {
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        LINK_FULL_TITLE: {
          type: 'string'
        }
      }
    },
    AUDIO_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['SCHEMA', 'LINK_FULL_TITLE', 'SHOW_FIRST_LINES', 'SHOW_TITLES', 'SHOW_SHUFFLE', 'ALL_RECORDINGS', 'SHOW_ALL'],
      properties: {
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        LINK_FULL_TITLE: { type: 'string' },
        SHOW_FIRST_LINES: { type: 'string' },
        SHOW_TITLES: { type: 'string' },
        SHOW_SHUFFLE: { type: 'string' },
        ALL_RECORDINGS: { type: 'string' },
        SHOW_ALL: { type: 'string' }
      }
    },
    AUTHORS_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['HEAD', 'SCHEMA', 'LINK_FULL_TITLE', 'UNKNOWN_AUTHOR'],
      properties: {
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        LINK_FULL_TITLE: {
          type: 'string'
        },
        UNKNOWN_AUTHOR: {
          type: 'string'
        }
      }
    },
    BOOK_LIST_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['HEAD', 'SCHEMA', 'SONG_COUNT', 'OTHER_SONGBOOKS', 'BACK'],
      properties: {
        BACK: { type: 'string' },
        OTHER_SONGBOOKS: { type: 'string' },
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SONG_COUNT: {
          type: 'string'
        }
      }
    },
    FOOTER: {
      type: 'object',
      additionalProperties: false,
      required: ['BOOKS', 'CONTENTS', 'INDEX', 'SEARCH'],
      properties: {
        BOOKS: {
          type: 'string'
        },
        CONTENTS: {
          type: 'string'
        },
        INDEX: {
          type: 'string'
        },
        SEARCH: {
          type: 'string'
        }
      }
    },
    CONTENTS_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['HEAD', 'SCHEMA', 'LINK_FULL_TITLE'],
      properties: {
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        LINK_FULL_TITLE: {
          type: 'string'
        }
      }
    },
    NOT_FOUND_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: ['HEAD', 'SCHEMA', 'TEXT', 'TITLE'],
      properties: {
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        TEXT: {
          type: 'string'
        },
        TITLE: {
          type: 'string'
        }
      }
    },
    SEARCH_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: [
        'HEAD',
        'SCHEMA',
        'CLEAR',
        'FIND',
        'INPUT_PLACEHOLDER',
        'LOAD_MORE',
        'NO_RESULTS',
        'PAGE_LIST',
        'OR_ENTER_PAGE'
      ],
      properties: {
        HEAD: {
          type: 'object',
          additionalProperties: false,
          required: ['DESCRIPTION'],
          properties: {
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        SCHEMA: {
          type: 'object',
          additionalProperties: false,
          required: ['NAME', 'DESCRIPTION'],
          properties: {
            NAME: {
              type: 'string'
            },
            DESCRIPTION: {
              type: 'string'
            }
          }
        },
        CLEAR: {
          type: 'string'
        },
        FIND: {
          type: 'string'
        },
        INPUT_PLACEHOLDER: {
          type: 'string'
        },
        LOAD_MORE: {
          type: 'string'
        },
        NO_RESULTS: {
          type: 'string'
        },
        PAGE_LIST: {
          type: 'string'
        },
        OR_ENTER_PAGE: {
          type: 'string'
        }
      }
    },
    SONG_PAGE: {
      type: 'object',
      additionalProperties: false,
      required: [
        'CLOSE',
        'COPY',
        'COPY_LINK',
        'NEXT_SONG',
        'OTHER_TRANSLATIONS',
        'PREVIOUS_SONG',
        'SHARE',
        'SHARE_SONG',
        'SHOW_TRANSLATION',
        'PAGE_NUMBER',
        'PAGE_IN_PAPER_SONGBOOK',
        'NEXT',
        'AUDIO_CAPTION',
        'AUDIO_OFFLINE_CAPTION',
        'META_DESCRIPTION',
        'META_DESCRIPTION_NO_AUTHOR'
      ],
      properties: {
        CLOSE: {
          type: 'string'
        },
        COPY: {
          type: 'string'
        },
        COPY_LINK: {
          type: 'string'
        },
        NEXT_SONG: {
          type: 'string'
        },
        OTHER_TRANSLATIONS: {
          type: 'string'
        },
        PREVIOUS_SONG: {
          type: 'string'
        },
        SHARE: {
          type: 'string'
        },
        SHARE_SONG: {
          type: 'string'
        },
        SHOW_TRANSLATION: {
          type: 'string'
        },
        PAGE_NUMBER: {
          type: 'string'
        },
        PAGE_IN_PAPER_SONGBOOK: {
          type: 'string'
        },
        NEXT: {
          type: 'string'
        },
        AUDIO_CAPTION: {
          type: 'string'
        },
        AUDIO_OFFLINE_CAPTION: {
          type: 'string'
        },
        META_DESCRIPTION: {
          type: 'string'
        },
        META_DESCRIPTION_NO_AUTHOR: {
          type: 'string'
        }
      }
    },
    DISPLAY_MODE_MENU: {
      type: 'object',
      additionalProperties: false,
      required: [
        'SHOW_ALL',
        'VERSES_ONLY',
        'TRANSLATION_ONLY',
        'HIDE_WBW',
        'INLINE_WBW',
        'CLASSICAL_WBW',
        'LEARN_MODE',
        'COMPACT_VIEW'
      ],
      properties: {
        SHOW_ALL: { type: 'string' },
        VERSES_ONLY: { type: 'string' },
        TRANSLATION_ONLY: { type: 'string' },
        HIDE_WBW: { type: 'string' },
        INLINE_WBW: { type: 'string' },
        CLASSICAL_WBW: { type: 'string' },
        LEARN_MODE: { type: 'string' },
        COMPACT_VIEW: { type: 'string' }
      }
    },
    i18n: {
      type: 'object',
      additionalProperties: false,
      required: [
        'Bhakti Lalita Devi',
        'Srila Sridhar Maharaj',
        'Srila Govinda Maharaj',
        'Sripad Bhagavat Maharaj',
        'Srila Acharya Maharaj',
        'Srila Madhusudan Maharaj',
        'Srila Goswami Maharaj',
        'Srila Avadhut Maharaj',
        'Sudarshan Prabhu',
        'Karakas Dham',
        'Navadvip Dham'
      ],
      properties: {
        'Bhakti Lalita Devi': {
          type: 'string'
        },
        'Srila Sridhar Maharaj': {
          type: 'string'
        },
        'Srila Govinda Maharaj': {
          type: 'string'
        },
        'Sripad Bhagavat Maharaj': {
          type: 'string'
        },
        'Srila Acharya Maharaj': {
          type: 'string'
        },
        'Srila Madhusudan Maharaj': {
          type: 'string'
        },
        'Srila Goswami Maharaj': {
          type: 'string'
        },
        'Srila Avadhut Maharaj': {
          type: 'string'
        },
        'Sudarshan Prabhu': {
          type: 'string'
        },
        'Karakas Dham': {
          type: 'string'
        },
        'Navadvip Dham': {
          type: 'string'
        }
      }
    },
    META: {
      type: 'object',
      additionalProperties: false,
      required: ['TRANSLATION_NAME'],
      properties: {
        TRANSLATION_NAME: {
          type: 'string'
        }
      }
    },
    OFFLINE: {
      type: 'object',
      additionalProperties: false,
      required: [
        'ALL_TOTAL',
        'APP_HTML',
        'APP_IMAGES',
        'APP_RESOURCES',
        'AVAILABLE',
        'BOOK_IMAGES',
        'BOOK_TOTAL',
        'NOT_SAVED',
        'SAVING',
        'TEXTS'
      ],
      properties: {
        ALL_TOTAL: { type: 'string' },
        APP_HTML: { type: 'string' },
        APP_IMAGES: { type: 'string' },
        APP_RESOURCES: { type: 'string' },
        AVAILABLE: { type: 'string' },
        BOOK_IMAGES: { type: 'string' },
        BOOK_TOTAL: { type: 'string' },
        NOT_SAVED: { type: 'string' },
        SAVING: { type: 'string' },
        TEXTS: { type: 'string' }
      }
    },
		FEEDBACK: {
			type: 'object',
			additionalProperties: false,
      required: ['APPEAL', 'DELIVERY_ERROR', 'FIELDS', 'OFFLINE', 'TITLE', 'TRIGGER_TEXT', 'TU_MESSAGE'],
			properties: {
        DELIVERY_ERROR: {
          type: 'string'
        },
				APPEAL: {
					type: 'string'
				},
				OFFLINE: {
					type: 'string'
				},
				TITLE: {
					type: 'string'
				},
				TRIGGER_TEXT: {
					type: 'string'
				},
				TU_MESSAGE: {
					type: 'string'
				},
				FIELDS: {
					type: 'object',
					additionalProperties: false,
					required: ['EMAIL', 'IMAGE', 'MESSAGE', 'NAME', 'SUBMIT'],
					properties: {
						EMAIL: {
							type: 'object',
							additionalProperties: false,
							required: ['LABEL', 'VALIDATION'],
							properties: {
								LABEL: {
									type: 'string'
								},
								VALIDATION: {
									type: 'object',
									additionalProperties: false,
									required: ['INVALID'],
									properties: {
										INVALID: {
											type: 'string'
										}
									}
								}
							}
						},
						IMAGE: {
							type: 'object',
							additionalProperties: false,
							required: ['SUBTEXT', 'TEXT', 'VALIDATION'],
							properties: {
								SUBTEXT: {
									type: 'string'
								},
								TEXT: {
									type: 'string'
								},
								VALIDATION: {
									type: 'object',
									additionalProperties: false,
									required: ['SIZE', 'TYPE'],
									properties: {
										SIZE: {
											type: 'string'
										},
										TYPE: {
											type: 'string'
										}
									}
								}
							}
						},
						MESSAGE: {
							type: 'object',
							additionalProperties: false,
							required: ['LABEL', 'PLACEHOLDER', 'VALIDATION'],
							properties: {
								LABEL: {
									type: 'string'
								},
								PLACEHOLDER: {
									type: 'string'
								},
								VALIDATION: {
									type: 'object',
									additionalProperties: false,
									required: ['MAX_LENGTH', 'MIN_LENGTH'],
									properties: {
										MAX_LENGTH: {
											type: 'string'
										},
										MIN_LENGTH: {
											type: 'string'
										}
									}
								}
							}
						},
						NAME: {
							type: 'object',
							additionalProperties: false,
							required: ['LABEL', 'VALIDATION'],
							properties: {
								LABEL: {
									type: 'string'
								},
								VALIDATION: {
									type: 'object',
									additionalProperties: false,
									required: ['MAX_LENGTH'],
									properties: {
										MAX_LENGTH: {
											type: 'string'
										}
									}
								}
							}
						},
						SUBMIT: {
							type: 'string'
						}
					}
				}
			}
		}
  }
};

/**
 *
 */
const SONGBOOKS_VALIDATION_SCHEMA = {
	type: 'object',
	additionalProperties: true,
	required: ['slug', 'songsCount', 'subtitle', 'title'],
	properties: {
		audio: { type: 'object' },
		hidden: { type: 'boolean' },
    is_legacy: {
      anyOf: [
        { type: 'boolean' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            show_micro_thumbnail_on_main: { type: 'boolean' }
          }
        }
      ]
    },
		shortcuts: {
			type: 'array',
			items: {
				type: 'object',
				required: ['icon', 'slug', 'title'],
				properties: {
					icon: { type: 'string' },
					slug: { type: 'string' },
					title: { type: 'string' }
				}
			}
		},
		slug: { type: 'string' },
		songsCount: { type: 'number' },
		sort_order: { type: 'number' },
		subtitle: { type: 'string' },
		title: { type: 'string' },
	}
};

/**/
module.exports = {
	SONGBOOKS_VALIDATION_SCHEMA,
	TRANSLATION_VALIDATION_SCHEMA
};
