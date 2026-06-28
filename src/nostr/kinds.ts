// Nostr event kinds this client speaks. Names mirror the NIPs so the mapping
// from "MSN feature" to "Nostr event" stays legible at every call site.

export const KIND_METADATA = 0; // NIP-01 profile (name / about / picture)
export const KIND_CONTACTS = 3; // NIP-02 follow list — our buddy list
export const KIND_DM_LEGACY = 4; // NIP-04 encrypted DM (received-only interop)
export const KIND_CHAT = 14; // NIP-17 chat message (the unsigned "rumor")
export const KIND_GIFT_WRAP = 1059; // NIP-59 gift wrap that carries a NIP-17 DM
export const KIND_STATUS = 30315; // NIP-38 user status — our presence + PSM
export const KIND_APP_DATA = 30078; // NIP-78 app-specific data — our read markers
// App-specific ephemeral "is typing" ping. Kinds in 20000–29999 are ephemeral:
// relays forward them to live subscriptions but never store them, so typing
// state is truly transient — no backlog to replay, nothing left on disk.
export const KIND_TYPING = 20817;

/** NIP-78 `d`-tag namespacing our read markers among any other app data. */
export const APP_DATA_READ = 'memesen/read-markers';
