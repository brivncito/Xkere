# Xkere — plan de integración técnica inspirada en RiceCall

## Objetivo
Construir Xkere como una plataforma propia de comunidades, chat y voz en tiempo real, tomando como referencia técnica RiceCall sin convertir el proyecto en un simple cambio de marca.

## Fuente de referencia y licencia
- Repositorio estudiado: https://github.com/brivncito/RiceCall
- La copia pública consultada declara licencia MIT en LICENSE (copyright 2025 NerdyHomeReOpen).
- Mantener aviso de copyright y licencia en cualquier archivo de RiceCall que se copie o adapte, junto con referencias de procedencia.
- El README de RiceCall aclara que es un proyecto independiente y no oficial de RaidCall; Xkere también debe presentarse como proyecto independiente y no afiliado.

## Arquitectura observada en RiceCall
- Cliente: React / Electron.
- Backend separado: Node.js.
- Base de datos: MySQL.
- Transporte: WebRTC, WebSocket y HTTP.
- Módulos observados: API client, services, socket, auth, accounts, tipos de base de datos, permisos, hooks WebRTC, estados de audio, páginas de servidor/canales/miembros.

## Decisión de arquitectura para Xkere
- Mantener React + TypeScript + Vite en el cliente web actual.
- Mantener Supabase Auth/Postgres como backend inicial, sujeto a diseño de esquema y políticas RLS.
- Usar Supabase Realtime para mensajes y presencia inicial si encaja con las necesidades.
- Evaluar WebRTC con servidor SFU administrado/compatible (p. ej. LiveKit) para voz; no copiar directamente el cliente mediasoup de RiceCall sin el backend SFU compatible.
- Mantener interfaces de transporte y servicios desacopladas de React para poder reemplazar proveedores.
- Diseñar Electron/Tauri más adelante, sin incluir módulos de proceso principal de Electron en el build web.

## Fases
1. Auditar dependencias, contratos de eventos y modelos de datos de RiceCall.
2. Definir modelos propios de Xkere: perfiles, comunidades, miembros, roles/permisos, categorías, canales, mensajes, membresías de voz, amistades/presencia.
3. Implementar autenticación real y sesión segura.
4. Implementar comunidades/canales y permisos con RLS.
5. Implementar chat persistente y realtime.
6. Implementar infraestructura de voz y controles del cliente.
7. Incorporar administración, notificaciones, configuración y empaquetado Windows.
8. Pruebas automatizadas, seguridad y despliegue.

## Restricciones operativas
- No tocar `main`.
- Trabajar en `development/ricecall-study`.
- No copiar directorios completos de RiceCall ni módulos de backend ausentes.
- Antes de incorporar cualquier código fuente, comprobar el archivo y conservar atribución/licencia.
- No afirmar que audio, chat o autenticación reales funcionan hasta implementarlos y probarlos.
- La rama de producción debe permanecer estable.

## Próximo entregable
Auditoría breve de dependencias, módulos de transporte y modelos de datos de RiceCall, seguida de un diseño de esquema propio para Xkere.