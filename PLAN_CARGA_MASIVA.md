# Plan de Implementación: Carga Masiva y Análisis Predictivo de Presupuestos

Este documento detalla el plan de acción propuesto para el desarrollo del **Módulo de Carga Masiva de Históricos** y el **Motor de Sugerencias Presupuestarias**, con el objetivo de poder ser discutido y aprobado con el cliente final.

---

## 1. Módulo de Carga Masiva (Bulk Upload)

Se creará una interfaz y lógica para importar archivos de Excel (`.xlsx`) y parsearlos en la plataforma antes de inyectarlos a la base de datos (PostgreSQL vía Supabase). Esto permitirá poblar el sistema con meses o años de historial de forma rápida.

**Decisión Aprobada (Validación de Filas):**
El sistema será tolerante a fallos parciales. Se importarán de forma automática todas las filas válidas del archivo Excel. Aquellas filas que presenten errores (ej. "La cuenta contable no existe" o "Falta el monto") serán ignoradas durante la subida inicial, pero el sistema mostrará un reporte detallado indicando exactamente qué filas fallaron y el por qué. Esto permite corregir los errores puntuales en el Excel y volver a subir solo lo faltante sin perder el trabajo válido.

### Cambios Técnicos Propuestos
1. **`src/components/ui/BulkUploadModal.tsx`**: Modal reutilizable que lee y parsea el archivo `.xlsx` localmente (usando la librería `xlsx`) y muestra una tabla de vista previa de los datos a cargar.
2. **`src/features/invoices/server/bulk-actions.ts`**: Lógica de validación masiva en servidor para contrastar que las Cuentas Contables existan en el catálogo de la Empresa correspondiente y ejecutar un "Bulk Insert" en la base de datos para máxima velocidad.
3. **Puntos de Acceso**: Un botón "📥 Carga Masiva" en las pantallas de Facturas (Egresos) e Ingresos.

---

## 2. Motor de Sugerencia Inteligente de Presupuestos

Se añadirá la capacidad de autocompletar la matriz de un presupuesto basándose en el comportamiento real de un periodo histórico anterior.

**¿Cómo funcionará la experiencia?**
En la vista de detalle de un presupuesto vacío, el usuario encontrará un botón: "🔮 Sugerir Presupuesto basado en historial". Al hacer clic, podrá seleccionar el rango a analizar (Ej. "Últimos 6 meses"). El sistema calculará una distribución de fondos cuenta por cuenta y ofrecerá pre-rellenar el presupuesto.

### Opciones de Cálculo (Pendiente de Decisión por el Cliente)

El corazón de este motor es cómo interpretamos el historial. Se deben evaluar estas 4 opciones:

#### Opción 1: Promedio Simple (La más básica)
Suma total gastada en la cuenta durante el periodo histórico dividido por el número de meses.
- **Pro:** Muy fácil de auditar y entender.
- **Contra:** Ignora la inflación o picos estacionales. Si hace 6 meses se gastaba poco y hoy mucho, el promedio sugerirá un monto que posiblemente se quede corto.

#### Opción 2: Promedio Ponderado Reciente (Recomendada para inflación/tendencias)
Se da más peso (importancia multiplicativa) a los gastos de los últimos meses.
- **Pro:** Se adapta automáticamente a los aumentos de precios recientes. El presupuesto reflejará la realidad actual más que la de hace medio año.
- **Contra:** Matemáticamente un poco más compleja; si un gasto extraordinario ocurrió justo en el último mes, inflará mucho la sugerencia.

#### Opción 3: Base Histórica + Margen de Seguridad (Conservadora)
Usa el Promedio Simple (Opción 1), pero agrega un porcentaje extra fijo ("Colchón de Seguridad" o Factor Inflacionario) que el usuario puede definir (Ej: Promedio + 15%).
- **Pro:** Protege a la empresa de imprevistos garantizando que los fondos autorizados no se queden cortos. Es altamente parametrizable.
- **Contra:** Si no hay controles estrictos, presupuestos más holgados pueden incentivar a "gastar por gastar".

#### Opción 4: Límite Máximo Histórico (Tolerancia Cero a Sobregiros)
El sistema ignora los promedios y busca cuál fue **el mes más caro** del periodo histórico para cada cuenta, usando ese pico máximo como el nuevo límite mensual.
- **Pro:** Garantiza matemáticamente que los fondos siempre alcanzarán, basándose en el peor escenario histórico comprobado.
- **Contra:** Genera el Presupuesto Maestro global más alto e inflado de todas las opciones. Puede inmovilizar capital innecesariamente.

---

## 3. Próximos Pasos (Checklist de Aprobación)

- [ ] Definir y aprobar con el cliente cuál de las 4 opciones de cálculo (o qué combinación de ellas) se utilizará para el motor de sugerencias.
- [ ] Confirmar formato estricto de columnas requeridas para el archivo Excel (Ej: `Fecha`, `Proveedor`, `Monto USD`, `Código Cuenta Contable`, `Tasa de Cambio`).
- [ ] Dar luz verde al equipo de desarrollo para iniciar la codificación de la Fase 1 (Carga Masiva).
