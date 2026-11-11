# RiceCall audit notes for Xkere

## License review
RiceCall's public repository metadata reports MIT, and its LICENSE attributes copyright to NerdyHomeReOpen (2025). Preserve that notice and the full MIT license in any substantial reused/derived source file. The README describes RiceCall as an independent, unofficial community project and warns it is not affiliated with the original RaidCall team. Xkere remains an independent product; do not reuse RaidCall branding or assets without separate rights review.

## Modules mapped
- `src/main/socket/web.ts`: Socket.IO connection, heartbeat, event forwarding, ACK/retry wrapper.
- `src/configs/socket.ts`: client/server event allowlists.
- `src/providers/WebRTC.tsx`: React context exposing voice actions and audio controls.
- `src/hooks/WebRTC/useSFUTransport.ts`: mediasoup-client send/receive transports, consumers/producers, SFU signaling.
- `src/hooks/WebRTC/useMicAudio.ts`: microphone capture and processing controls.
- `src/types/database/index.ts`: conceptual user, server, channel, member, permission, friend and message data shapes.
- `src/types/index.ts`: domain/event types; imports mediasoup-client.
- `src/main/electron.ts`, `preload.ts`, IPC and main-process modules: desktop-only and not portable to Vite web.

## Important integration findings
- RiceCall's voice client is not self-contained: `useSFUTransport.ts` expects server signaling events such as `SFUCreateTransport`, `SFUConnectTransport`, `SFUCreateProducer`, and `SFUCreateConsumer`, plus router RTP capabilities from an SFU backend.
- Its Socket.IO client uses a server URL and authenticated token; copying the client transport alone cannot produce a working chat or voice backend.
- The RiceCall package is Next.js + Electron + mediasoup-client + Socket.IO, whereas Xkere is currently Vite React + Supabase. Do not copy the Electron process, IPC, or Next app scaffolding into the web project.
- Its data types show useful product concepts, but they are not proof of a deployable SQL schema or complete authorization policy.

## Planned Xkere mapping
- Profiles/accounts → Supabase Auth + `profiles`.
- Servers/members → `communities` + `community_members`.
- Permission tiers → community roles + member-role assignments; model permissions as explicit capability bits and validate on the server.
- Categories/channels → `channels` with `kind=text|voice|category` and optional `parent_id`.
- Channel chat → persistent `messages`; realtime subscriptions only after RLS is validated.
- Friend relations → `friendships`.
- Voice presence → `voice_sessions`; actual media handled by a dedicated SFU/token service, not Supabase Realtime.

## Security cautions
- Never store plaintext passwords or client-side privileged service keys.
- RLS must enforce membership and role access for every read/write.
- Voice-provider credentials/tokens must be minted server-side and scoped to a room and user.
- The migration in this branch enables RLS but intentionally does not add permissive policies; it is a draft schema, not ready to apply to production.
