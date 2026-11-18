# NetBench: documentación del caso de estudio

Producto, arquitectura, motor, Eve y testing de NetBench. El portafolio la lee de esta carpeta al construirse y la publica en [cristiancode.dev/featured/netbench/docs](https://cristiancode.dev/featured/netbench/docs) y [cristiancode.dev/featured/netbench/testing](https://cristiancode.dev/featured/netbench/testing). Los ficheros `NN-testing*.md` van a la página de testing y el resto, a la de documentación. Este índice no se publica.

| #   | Documento |
| --- | --- |
| 01  | [Visión general](./01-overview.md) |
| 02  | [Producto y features](./02-product.md) |
| 03  | [Arquitectura](./03-architecture.md) |
| 04  | [Monorepo](./04-monorepo.md) |
| 05  | [API](./05-api.md) |
| 06  | [Cuentas e invitados](./06-auth.md) |
| 07  | [Modelo de datos](./07-data-model.md) |
| 08  | [Puesta en marcha y despliegue](./08-deploy.md) |
| 09  | [Decisiones](./09-decisions.md) |
| 10  | [Retos y resultados](./10-challenges-results.md) |
| 11  | [Angular](./11-angular-skill.md) |
| 12  | [Testing · visión](./12-testing.md) |
| 13  | [Testing · motor](./13-testing-unit.md) |
| 14  | [Testing · API](./14-testing-integration.md) |
| 15  | [Testing · Eve y navegador](./15-testing-e2e.md) |
| 16  | [Testing · CI](./16-testing-ci.md) |
| 17  | [El motor](./17-engine.md) |
| 18  | [Eve, el instructor](./18-eve.md) |
| 19  | [Laboratorios](./19-curriculum.md) |
| 20  | [Comandos](./20-commands.md) |

Cada fichero empieza con un `title` en su frontmatter, que es el nombre que enseña el portafolio. El esquema JSON de un laboratorio está en [`packages/engine/schema/lab.schema.json`](../packages/engine/schema/lab.schema.json).

Cuando cambia algo de esta carpeta en `main`, `.github/workflows/portfolio-docs.yml` pide al portafolio que se reconstruya.

## Por dónde empezar

- **Para entender el proyecto:** [Visión general](./01-overview.md) y [Producto](./02-product.md).
- **Para entender cómo funciona:** [Arquitectura](./03-architecture.md) y [El motor](./17-engine.md).
- **Para arrancarlo:** [Puesta en marcha](./08-deploy.md).
- **Para el instructor:** [Eve](./18-eve.md).
