"""Dataset de consejos para sembrar la base de datos.

Estructura:
    CLASIFICACIONES: lista de dicts (nombre, descripcion, orden)
    ETIQUETAS: lista de strings
    ARTICULOS: lista de dicts (clasificacion, titulo, resumen, cuerpo, etiquetas[])

El cuerpo usa texto plano con saltos de línea. El frontend lo renderiza
preservando saltos (whiteSpace: pre-wrap).
"""

CLASIFICACIONES = [
    {
        "nombre": "Aspectos básicos de salud reproductiva",
        "descripcion": "Higiene, anatomía y conceptos esenciales sobre tu cuerpo.",
        "orden": 1,
    },
    {
        "nombre": "Ciclo menstrual",
        "descripcion": "Entiende tus fases, hormonas y síntomas.",
        "orden": 2,
    },
    {
        "nombre": "Sexo y placer",
        "descripcion": "Sexualidad consciente, deseo y conexión.",
        "orden": 3,
    },
    {
        "nombre": "Embarazo y fertilidad",
        "descripcion": "Desde la concepción hasta el postparto.",
        "orden": 4,
    },
    {
        "nombre": "Anticoncepción",
        "descripcion": "Métodos, eficacia y cómo elegir el tuyo.",
        "orden": 5,
    },
    {
        "nombre": "Salud mental y bienestar",
        "descripcion": "Emociones, ansiedad, sueño y autoestima.",
        "orden": 6,
    },
    {
        "nombre": "Cuerpo y autocuidado",
        "descripcion": "Movimiento, nutrición y rutinas que cuidan tu cuerpo.",
        "orden": 7,
    },
]

ETIQUETAS = [
    "vaginal", "vulva", "útero", "hormonas", "regla", "ovulación",
    "embarazo", "sexo", "placer", "ansiedad", "mental", "higiene",
    "nutrición", "ejercicio", "mitos", "síntomas", "anticoncepción",
    "adolescencia", "fertilidad", "ciclo",
]

ARTICULOS = [
    # ─────────── Aspectos básicos ───────────
    {
        "clasificacion": "Aspectos básicos de salud reproductiva",
        "titulo": "Guía de colores del flujo vaginal",
        "resumen": "Qué significa cada tonalidad de tu flujo y cuándo conviene consultar.",
        "cuerpo": (
            "Tu flujo vaginal cambia a lo largo del ciclo, y observarlo es una forma sencilla de "
            "conocer tu cuerpo.\n\n"
            "🤍 Transparente o blanco lechoso → Normal. Suele ser más abundante cerca de la ovulación.\n\n"
            "💛 Amarillento muy claro → Puede ser normal, sobre todo al secarse. Si va acompañado de "
            "olor fuerte o picor, conviene consultar.\n\n"
            "🟢 Verdoso o amarillo intenso → Posible infección (tricomoniasis, vaginosis). Consulta "
            "con tu ginecóloga.\n\n"
            "🤎 Marrón → Sangre antigua. Es habitual al inicio o final de la regla.\n\n"
            "❤️ Rojo → Menstruación o sangrado. Si ocurre fuera del ciclo y se repite, consulta.\n\n"
            "⚪ Blanco espeso tipo «queso fresco» → Posible candidiasis. Va con picor.\n\n"
            "Recuerda: el olor y la textura también importan. Conocer tu patrón habitual te ayudará a "
            "detectar cambios que merezcan una visita médica."
        ),
        "etiquetas": ["vaginal", "higiene", "síntomas"],
    },
    {
        "clasificacion": "Aspectos básicos de salud reproductiva",
        "titulo": "Cómo lavarte la vulva correctamente",
        "resumen": "La vagina se limpia sola. La vulva sí necesita cuidados externos suaves.",
        "cuerpo": (
            "La vagina (el interior) tiene un equilibrio bacteriano que se mantiene solo. La vulva "
            "(la parte externa) sí se lava, pero con cuidados muy concretos.\n\n"
            "✅ Qué hacer:\n"
            "• Lava una vez al día, dos como mucho.\n"
            "• Usa agua templada y, si quieres jabón, que sea pH neutro o sindet específico.\n"
            "• Sécate dando toques con la toalla, no frotando.\n"
            "• Lleva ropa interior de algodón.\n\n"
            "❌ Qué evitar:\n"
            "• Duchas vaginales internas (alteran la flora y aumentan infecciones).\n"
            "• Geles perfumados, desodorantes íntimos o salviettes con alcohol.\n"
            "• Esponjas reutilizadas en la zona genital.\n"
            "• Ropa muy ajustada y tejidos sintéticos durante muchas horas.\n\n"
            "Si notas picor, irritación o cambios persistentes, no insistas con jabones: consulta."
        ),
        "etiquetas": ["vulva", "higiene", "mitos"],
    },
    {
        "clasificacion": "Aspectos básicos de salud reproductiva",
        "titulo": "Anatomía 101: lo que sí o sí deberías saber de tu cuerpo",
        "resumen": "Una vuelta rápida por vulva, vagina, útero, ovarios y trompas.",
        "cuerpo": (
            "Conocer tu anatomía es la base para entender lo que sientes.\n\n"
            "🌸 Vulva — Es la parte externa: monte de Venus, labios mayores y menores, clítoris y "
            "entrada vaginal. El clítoris es muchísimo más grande de lo que parece a simple vista; la "
            "mayor parte es interna.\n\n"
            "🌷 Vagina — Conducto interno y elástico que conecta la vulva con el cuello del útero. Se "
            "limpia y lubrica por sí misma.\n\n"
            "🌺 Útero — Órgano muscular del tamaño de una pera. Su capa interna (endometrio) crece y "
            "se descama cada ciclo: eso es la regla.\n\n"
            "🌼 Trompas de Falopio — Dos canales que conectan los ovarios con el útero. Es donde "
            "ocurre la fecundación si el óvulo se encuentra con un espermatozoide.\n\n"
            "🌻 Ovarios — Producen óvulos y las hormonas sexuales (estrógeno, progesterona, también "
            "testosterona en pequeñas cantidades).\n\n"
            "Si tu vulva no se parece a las que aparecen en libros o porno: relax, hay tantas formas "
            "como personas."
        ),
        "etiquetas": ["vaginal", "vulva", "útero", "adolescencia"],
    },
    {
        "clasificacion": "Aspectos básicos de salud reproductiva",
        "titulo": "Mitos comunes sobre la higiene íntima",
        "resumen": "Lo que te contaron y la realidad detrás.",
        "cuerpo": (
            "🚫 «Tienes que lavarte por dentro con duchas vaginales» → FALSO. Alteran la flora y "
            "aumentan infecciones. Solo lava la zona externa.\n\n"
            "🚫 «Cuanto más perfumado el jabón, más limpia» → FALSO. Los perfumes irritan. Mejor "
            "pH neutro.\n\n"
            "🚫 «Si huele a algo, está sucio» → FALSO. La vulva tiene un olor natural propio. Si "
            "cambia mucho (pescado, fermento) puede indicar infección.\n\n"
            "🚫 «Hay que depilarse por higiene» → FALSO. El vello protege. Depílate solo si tú quieres "
            "estéticamente.\n\n"
            "🚫 «Lavarse después de tener sexo previene ETS» → FALSO. Solo el preservativo previene "
            "ETS. Orinar después sí ayuda a prevenir infecciones urinarias.\n\n"
            "Tu cuerpo no está sucio: está vivo."
        ),
        "etiquetas": ["mitos", "higiene", "vulva"],
    },

    # ─────────── Ciclo menstrual ───────────
    {
        "clasificacion": "Ciclo menstrual",
        "titulo": "Las 4 fases del ciclo menstrual",
        "resumen": "Menstrual, folicular, ovulatoria y lútea: qué pasa en cada una.",
        "cuerpo": (
            "Tu ciclo no es solo «los días de la regla». Es un baile hormonal de unas 4 semanas con "
            "4 fases diferenciadas.\n\n"
            "🩸 Fase menstrual (días 1-5 aprox.) — El endometrio se descama. Energía baja, apetencia "
            "de descanso. Estrógenos y progesterona en su mínimo.\n\n"
            "🌱 Fase folicular (días 1-13 aprox.) — Sube el estrógeno. Te sentirás con más energía, "
            "mejor humor y la piel suele mejorar.\n\n"
            "✨ Fase ovulatoria (días 13-15 aprox.) — Pico de estrógeno y se libera el óvulo. Libido "
            "alta, comunicación fácil, sociable.\n\n"
            "🌙 Fase lútea (días 16-28 aprox.) — Sube la progesterona y luego cae. Puede aparecer "
            "SPM: cansancio, ansiedad, hinchazón.\n\n"
            "Saber en qué fase estás te ayuda a planificar trabajo, deporte, descanso y citas con tu "
            "pareja con más sentido."
        ),
        "etiquetas": ["ciclo", "hormonas", "regla"],
    },
    {
        "clasificacion": "Ciclo menstrual",
        "titulo": "¿Qué es la ovulación y cómo identificarla?",
        "resumen": "Señales corporales para saber cuándo ovulas.",
        "cuerpo": (
            "La ovulación es el momento en que el ovario libera un óvulo. Dura unas 24 horas, pero la "
            "ventana fértil incluye los 5 días antes (los espermatozoides sobreviven hasta 5 días).\n\n"
            "Señales habituales:\n"
            "• 💧 Flujo cervical tipo «clara de huevo»: transparente, elástico, abundante.\n"
            "• 🔥 Subida de temperatura basal (≈0.3°C) tras la ovulación.\n"
            "• 💗 Aumento de libido y mejor humor.\n"
            "• ⚡ A veces dolor breve en un costado (Mittelschmerz).\n"
            "• 🥒 Pechos más sensibles.\n\n"
            "Si tienes ciclos regulares, ovulas unos 14 días ANTES de tu siguiente regla. En ciclos "
            "irregulares, los tests de ovulación o la temperatura basal son más fiables que contar "
            "días.\n\n"
            "Saber cuándo ovulas sirve para buscar embarazo, evitarlo o simplemente conocerte mejor."
        ),
        "etiquetas": ["ovulación", "ciclo", "fertilidad"],
    },
    {
        "clasificacion": "Ciclo menstrual",
        "titulo": "Síntomas premenstruales: por qué pasan y cómo aliviarlos",
        "resumen": "Hinchazón, ansiedad, cansancio... no son «en tu cabeza».",
        "cuerpo": (
            "El SPM (síndrome premenstrual) aparece en la fase lútea, cuando cae la progesterona "
            "antes de la regla. Lo sufren en distinto grado 3 de cada 4 mujeres.\n\n"
            "Síntomas frecuentes:\n"
            "• 🌊 Retención de líquidos e hinchazón abdominal.\n"
            "• 😣 Cambios de humor, irritabilidad, ansiedad.\n"
            "• 😴 Cansancio inexplicable.\n"
            "• 🍫 Antojos (especialmente dulce/sal).\n"
            "• 🤕 Dolor de cabeza, pechos sensibles.\n\n"
            "Qué ayuda:\n"
            "✅ Ejercicio suave y regular.\n"
            "✅ Reducir cafeína, alcohol y sal en la semana previa.\n"
            "✅ Magnesio y vitamina B6 (consulta antes de suplementar).\n"
            "✅ Dormir 7-8 horas.\n"
            "✅ Anotar tus síntomas: si interfieren mucho en tu vida, puede ser TDPM (más severo) y "
            "merece consulta médica."
        ),
        "etiquetas": ["síntomas", "hormonas", "regla", "mental"],
    },
    {
        "clasificacion": "Ciclo menstrual",
        "titulo": "¿Mi regla es irregular? Cuándo preocuparse",
        "resumen": "Qué se considera normal y qué señales sí merecen consulta.",
        "cuerpo": (
            "Un ciclo «normal» dura entre 21 y 35 días, y la regla suele durar 3-7 días. Pero cada "
            "cuerpo tiene su patrón.\n\n"
            "🟢 Es habitual:\n"
            "• Variaciones de unos días entre ciclos.\n"
            "• Ciclos irregulares en la adolescencia o cerca de la menopausia.\n"
            "• Cambios tras dejar anticonceptivos.\n\n"
            "🟡 Merece consulta:\n"
            "• Ciclos consistentemente <21 o >35 días.\n"
            "• Reglas que duran >7 días o con sangrado muy abundante (cambias compresa cada hora).\n"
            "• Manchados frecuentes entre reglas.\n"
            "• Dolor que te impide hacer vida normal.\n"
            "• Ausencia de regla >3 meses sin estar embarazada.\n\n"
            "Detrás puede haber tiroides, SOP, endometriosis, estrés crónico, peso muy bajo... No te "
            "autodiagnostiques, pide cita."
        ),
        "etiquetas": ["regla", "ciclo", "síntomas"],
    },

    # ─────────── Sexo y placer ───────────
    {
        "clasificacion": "Sexo y placer",
        "titulo": "Nueve consejos para una vida sexual placentera",
        "resumen": "Comunicación, autoconocimiento y placer sin presiones.",
        "cuerpo": (
            "1️⃣ Conócete tú primero. Masturbarte es una forma legítima y útil de aprender qué te "
            "gusta. Lo que disfrutas tú podrás guiarlo después en pareja.\n\n"
            "2️⃣ Habla. Decir lo que te gusta no «rompe la magia», la mejora.\n\n"
            "3️⃣ Olvida el guion del orgasmo coital. Solo un 25% de mujeres llega al orgasmo con "
            "penetración sola: el clítoris es el principal protagonista.\n\n"
            "4️⃣ Dedica tiempo a los preliminares: no son un trámite, son sexo.\n\n"
            "5️⃣ Usa lubricante. No significa que «no funcione tu cuerpo», significa que es más "
            "cómodo y prolongado.\n\n"
            "6️⃣ Negocia los ritmos. El deseo varía con el ciclo, el estrés, el momento de vida.\n\n"
            "7️⃣ Cuida la salud genital: revisiones, ETS, cistitis recurrentes.\n\n"
            "8️⃣ Practica el consentimiento explícito. «Sí» es solo un sí entusiasta.\n\n"
            "9️⃣ Lo bueno no es siempre intenso. A veces es lento, lento y profundo."
        ),
        "etiquetas": ["sexo", "placer"],
    },
    {
        "clasificacion": "Sexo y placer",
        "titulo": "Lubricación: por qué a veces falta",
        "resumen": "No es siempre falta de deseo. Te explicamos las causas.",
        "cuerpo": (
            "La lubricación vaginal depende de muchos factores: hormonales, emocionales y físicos.\n\n"
            "Causas comunes de sequedad:\n"
            "• 🌙 Fase del ciclo: en la lútea (premenstrual) baja.\n"
            "• 💊 Anticonceptivos hormonales: pueden reducirla.\n"
            "• 🤱 Postparto y lactancia: caída de estrógenos.\n"
            "• 🌡️ Perimenopausia y menopausia.\n"
            "• 💆 Estrés y ansiedad.\n"
            "• 🚿 Productos íntimos agresivos.\n"
            "• 🍷 Alcohol, tabaco, deshidratación.\n"
            "• 🛏️ No haber dedicado tiempo a los preliminares.\n\n"
            "Soluciones:\n"
            "✅ Usa lubricante sin glicerina (base agua o silicona).\n"
            "✅ Dedica más tiempo a preliminares y juego.\n"
            "✅ Habla con tu médica si es persistente: hay tratamientos.\n\n"
            "Que tu cuerpo necesite ayuda no significa que algo «esté mal». Es estar bien."
        ),
        "etiquetas": ["sexo", "placer", "hormonas", "síntomas"],
    },
    {
        "clasificacion": "Sexo y placer",
        "titulo": "Cómo comunicarte mejor con tu pareja",
        "resumen": "Frases que ayudan, frases que sabotean y cómo abrir el tema.",
        "cuerpo": (
            "Hablar de sexo cuesta porque arrastramos vergüenza. Pero la comunicación es lo que "
            "más predice satisfacción en pareja.\n\n"
            "🟢 Frases que ayudan:\n"
            "• «Me encanta cuando...»\n"
            "• «¿Probamos...? Me da curiosidad.»\n"
            "• «Hoy no me apetece, no es por ti.»\n"
            "• «¿Cómo lo has vivido tú?»\n\n"
            "🔴 Frases que cierran:\n"
            "• «Nunca / siempre haces...»\n"
            "• «Otras parejas sí...»\n"
            "• «Si me quisieras, lo harías.»\n\n"
            "Momentos: no hables en plena discusión ni justo después de un encuentro frustrante. "
            "Mejor en un momento neutro: paseo, sobremesa, abrazo en el sofá.\n\n"
            "Y recuerda: pedir es vulnerable. Recibe lo que la otra persona te diga sin defensa."
        ),
        "etiquetas": ["sexo", "mental"],
    },

    # ─────────── Embarazo y fertilidad ───────────
    {
        "clasificacion": "Embarazo y fertilidad",
        "titulo": "Señales tempranas de embarazo",
        "resumen": "Más allá del retraso: lo que tu cuerpo te puede contar.",
        "cuerpo": (
            "Algunos cuerpos notan cambios desde la primera semana, otros no hasta el segundo mes.\n\n"
            "Señales habituales:\n"
            "• 📅 Retraso de la regla.\n"
            "• 🤢 Náuseas, especialmente por la mañana (puede aparecer la semana 5-6).\n"
            "• 🥱 Cansancio intenso e inexplicable.\n"
            "• 🥲 Sensibilidad emocional y cambios de humor.\n"
            "• 🍒 Pechos hinchados, doloridos o más sensibles.\n"
            "• 🚽 Más ganas de orinar.\n"
            "• 👃 Olfato extra-sensible.\n"
            "• 🤰 Manchado leve de implantación (a veces se confunde con regla muy ligera).\n\n"
            "El test de embarazo es fiable a partir del primer día de retraso. Si das positivo, "
            "pide cita con ginecología para confirmar y empezar el seguimiento.\n\n"
            "Si los síntomas son fuertes o sangras de forma anormal, consulta antes."
        ),
        "etiquetas": ["embarazo", "fertilidad", "síntomas"],
    },
    {
        "clasificacion": "Embarazo y fertilidad",
        "titulo": "Cómo prepararte para concebir",
        "resumen": "Hábitos los meses antes que mejoran tus posibilidades.",
        "cuerpo": (
            "La preparación ideal empieza 3-6 meses antes de buscar el embarazo.\n\n"
            "✅ Visita preconcepcional con tu ginecóloga: revisa ciclos, vacunas (rubeola, "
            "varicela), tiroides, ferritina.\n\n"
            "✅ Empieza a tomar ácido fólico (400-800 µg/día) al menos 3 meses antes. Previene "
            "defectos del tubo neural.\n\n"
            "✅ Alimentación variada con folatos, hierro y omega-3.\n\n"
            "✅ Mantén un peso saludable. Tanto el bajo peso como la obesidad afectan a la "
            "fertilidad.\n\n"
            "✅ Reduce alcohol y cafeína. Deja de fumar (también tu pareja).\n\n"
            "✅ Ejercicio moderado y regular.\n\n"
            "✅ Identifica tu ventana fértil. Tener relaciones cada 2-3 días en torno a la "
            "ovulación es más eficaz que el «justo el día».\n\n"
            "Si llevas un año intentándolo (6 meses si tienes >35 años) sin éxito, consulta a un "
            "especialista en fertilidad."
        ),
        "etiquetas": ["embarazo", "fertilidad", "nutrición"],
    },
    {
        "clasificacion": "Embarazo y fertilidad",
        "titulo": "Alimentación recomendada en cada trimestre",
        "resumen": "Qué priorizar, qué reducir y qué evitar.",
        "cuerpo": (
            "🌱 Primer trimestre (semanas 1-13)\n"
            "Prioriza: ácido fólico, hierro, hidratación.\n"
            "Si tienes náuseas: come poco y a menudo, evita olores fuertes, prueba jengibre.\n\n"
            "🌷 Segundo trimestre (semanas 14-27)\n"
            "Prioriza: calcio (lácteos, sardinas, brócoli), omega-3 (pescado azul controlado), "
            "fibra.\n"
            "Aumento calórico real: ~340 kcal/día extra (no «comer por dos»).\n\n"
            "🌻 Tercer trimestre (semanas 28-40)\n"
            "Prioriza: proteínas, hierro, hidratación.\n"
            "Aumento calórico: ~450 kcal/día extra.\n\n"
            "❌ Evita durante todo el embarazo:\n"
            "• Alcohol (ninguna cantidad es segura).\n"
            "• Pescado con alto mercurio (atún rojo, pez espada).\n"
            "• Carnes y pescados crudos, embutidos no curados.\n"
            "• Lácteos no pasteurizados.\n"
            "• Cafeína: máximo 200 mg/día (≈1-2 cafés).\n\n"
            "Y por supuesto: cualquier suplemento, consultado siempre."
        ),
        "etiquetas": ["embarazo", "nutrición"],
    },

    # ─────────── Anticoncepción ───────────
    {
        "clasificacion": "Anticoncepción",
        "titulo": "Métodos anticonceptivos: cuál es para ti",
        "resumen": "Pros, contras y eficacia real de cada método.",
        "cuerpo": (
            "💊 Píldora combinada — 91-99% eficacia. Cómoda, regula ciclo. Requiere constancia "
            "diaria. Riesgos: trombos en fumadoras y >35 años.\n\n"
            "🩹 Parche / anillo vaginal — Como la píldora pero semanal/mensual.\n\n"
            "💉 Implante subdérmico — >99% eficacia. Dura 3 años. Sin pensar en él. Puede causar "
            "manchados irregulares.\n\n"
            "🪡 DIU hormonal — >99%. 5-7 años. Reduce la regla. Algo más caro al inicio.\n\n"
            "🟤 DIU de cobre — >99%. Hasta 10 años. Sin hormonas. Puede aumentar el sangrado.\n\n"
            "🌚 Inyección trimestral — Cómoda pero la fertilidad tarda más en volver.\n\n"
            "🛡️ Preservativo (condón) — 82-98% según uso. Único método que también previene ETS.\n\n"
            "🌿 Métodos naturales (sintotérmico) — 76-99% según rigor. Sin hormonas pero exigentes "
            "en disciplina.\n\n"
            "🚫 Esterilización (ligadura, vasectomía) — >99%, permanente.\n\n"
            "Habla con tu ginecóloga: no hay método «mejor», hay el mejor para ti, ahora."
        ),
        "etiquetas": ["anticoncepción", "sexo", "hormonas"],
    },
    {
        "clasificacion": "Anticoncepción",
        "titulo": "Anticoncepción de emergencia: lo que debes saber",
        "resumen": "Cuándo usarla, dónde conseguirla, cómo actúa.",
        "cuerpo": (
            "La «píldora del día después» es un recurso de emergencia, no un método regular.\n\n"
            "Cuándo se usa: relación sin protección, fallo del preservativo, olvido prolongado de la "
            "píldora.\n\n"
            "Tipos:\n"
            "• 🟢 Levonorgestrel (Norlevo): hasta 72 h. Más eficaz cuanto antes.\n"
            "• 🟣 Acetato de ulipristal (EllaOne): hasta 120 h.\n"
            "• 🩹 DIU de cobre de urgencia: hasta 5 días, más eficaz pero implica visita.\n\n"
            "Dónde conseguirla: farmacia sin receta en España. Servicios de urgencias y centros de "
            "planificación familiar.\n\n"
            "Efectos posibles: náuseas, sangrado irregular, retraso en la siguiente regla.\n\n"
            "Mitos:\n"
            "🚫 No es un aborto: actúa retrasando la ovulación.\n"
            "🚫 No protege contra ETS.\n"
            "🚫 No es para uso frecuente: hay opciones mucho mejores como anticoncepción habitual.\n\n"
            "Si la usas, aprovecha para revisar tu método regular con tu médica."
        ),
        "etiquetas": ["anticoncepción", "mitos"],
    },

    # ─────────── Salud mental ───────────
    {
        "clasificacion": "Salud mental y bienestar",
        "titulo": "Cómo gestionar la ansiedad antes y durante la regla",
        "resumen": "Estrategias concretas para los días premenstruales.",
        "cuerpo": (
            "La caída de progesterona en la fase lútea afecta a la serotonina, que regula el "
            "estado de ánimo. No te lo estás imaginando.\n\n"
            "🧘 Estrategias diarias en la fase premenstrual:\n"
            "• Dormir 7-8 horas (la falta de sueño dispara la ansiedad).\n"
            "• Reducir cafeína: estimula la respuesta de ansiedad.\n"
            "• Caminar 30 min al día al aire libre.\n"
            "• Respiración 4-7-8: inspira 4 seg, mantén 7, exhala 8. Repite 4 veces.\n"
            "• Diario emocional: escribir lo que sientes baja la rumiación.\n"
            "• Reducir scroll de redes sociales en estos días.\n\n"
            "🍫 Si vienen los antojos: prefiere chocolate >70% cacao, frutos secos, plátano. "
            "Magnesio (verduras de hoja, semillas) ayuda al sistema nervioso.\n\n"
            "🚨 Si la ansiedad es intensa cada ciclo, dura toda la fase lútea o interfiere mucho "
            "con tu vida, podría ser TDPM. Habla con tu médica: tiene tratamiento."
        ),
        "etiquetas": ["mental", "ansiedad", "hormonas", "ciclo"],
    },
    {
        "clasificacion": "Salud mental y bienestar",
        "titulo": "Autoestima e imagen corporal",
        "resumen": "Tu valor no depende de cómo se ve tu cuerpo.",
        "cuerpo": (
            "Vivimos rodeadas de imágenes editadas. Sentir que tu cuerpo «no llega» es una "
            "respuesta lógica a un entorno irreal, no una verdad sobre ti.\n\n"
            "Ideas que ayudan:\n\n"
            "🪞 Sigue cuentas que muestren cuerpos diversos. Deja de seguir los que te hacen "
            "compararte mal.\n\n"
            "🎯 Mueve el foco: «¿qué hace este cuerpo por mí?» en lugar de «¿cómo se ve?». Sube "
            "escaleras, abraza, ríe, descansa.\n\n"
            "🗣️ Habla de tu cuerpo como hablarías de tu mejor amiga.\n\n"
            "📓 Apunta 3 cosas que te gusten de ti cada día. No tienen que ser físicas.\n\n"
            "🚿 Lleva ropa que te haga sentir cómoda, no la que «toca» según la talla.\n\n"
            "💬 Pide ayuda profesional si la imagen corporal te hace evitar planes, pesarte "
            "compulsivamente, restringir comida o purgar. La salud mental también es salud."
        ),
        "etiquetas": ["mental", "ansiedad"],
    },
    {
        "clasificacion": "Salud mental y bienestar",
        "titulo": "Hábitos para dormir mejor",
        "resumen": "Tu calidad de sueño afecta a todo: ciclo, ánimo, libido.",
        "cuerpo": (
            "Una mala noche es eso, una mala noche. Pero el sueño crónicamente pobre afecta a las "
            "hormonas (cortisol, melatonina, insulina), a la regularidad menstrual y al deseo.\n\n"
            "🌙 Rutina nocturna que funciona:\n"
            "• Horario estable, incluso fines de semana.\n"
            "• Cena ligera 2-3 horas antes de acostarte.\n"
            "• Habitación fresca (18-20°C), oscura y silenciosa.\n"
            "• Sin pantallas 30-60 min antes de dormir (la luz azul retrasa la melatonina).\n"
            "• Lectura, ducha tibia o estiramientos suaves.\n\n"
            "☕ Durante el día:\n"
            "• Cafeína solo hasta las 14h.\n"
            "• Luz natural por la mañana: regula tu reloj biológico.\n"
            "• Ejercicio sí, pero intenso solo lejos de la hora de dormir.\n\n"
            "Si te despiertas mucho durante la noche o tardas más de 30 min en dormir, no lo "
            "normalices: revisa estrés, tiroides y, en pareja, posible apnea (ronquidos fuertes)."
        ),
        "etiquetas": ["mental", "hormonas"],
    },

    # ─────────── Cuerpo y autocuidado ───────────
    {
        "clasificacion": "Cuerpo y autocuidado",
        "titulo": "Ejercicio según tu fase del ciclo",
        "resumen": "Aprovecha tu energía en cada etapa.",
        "cuerpo": (
            "Tu rendimiento varía a lo largo del ciclo. Entrenar siguiéndolo en lugar de forzar a "
            "tope siempre puede ser más sostenible y eficaz.\n\n"
            "🩸 Menstrual — Cuerpo en modo recuperación. Camina, haz yoga suave, estiramientos. Si "
            "te apetece intenso, hazlo, pero no te exijas.\n\n"
            "🌱 Folicular — Sube la energía. Buen momento para entrenamientos de fuerza, HIIT y "
            "aprender movimientos nuevos.\n\n"
            "✨ Ovulación — Pico de fuerza y coordinación. Tus PRs (récords personales) suelen "
            "salir aquí.\n\n"
            "🌙 Lútea — Energía a la baja, sobre todo la segunda mitad. Cardio moderado, fuerza "
            "manteniendo cargas pero bajando volumen. Hidrátate bien (retención).\n\n"
            "💡 Reglas generales:\n"
            "• Lo mejor para tu cuerpo es moverte regularmente, sin obsesión.\n"
            "• Si entrenas fuerte, asegúrate de comer suficiente.\n"
            "• La amenorrea (falta de regla) por sobreentrenamiento es una señal de alarma."
        ),
        "etiquetas": ["ejercicio", "ciclo", "hormonas"],
    },
    {
        "clasificacion": "Cuerpo y autocuidado",
        "titulo": "Alimentación que cuida tus hormonas",
        "resumen": "Lo que comes influye en tu ciclo, energía y piel.",
        "cuerpo": (
            "No hay «dieta hormonal» mágica, pero hay patrones que cuidan tu sistema endocrino.\n\n"
            "🥑 Grasas buenas — Aguacate, frutos secos, aceite de oliva, pescado azul. Son base "
            "para fabricar hormonas.\n\n"
            "🥦 Verduras crucíferas — Brócoli, coles, kale. Ayudan al hígado a metabolizar "
            "estrógenos.\n\n"
            "🌾 Cereales integrales — Avena, arroz integral, quinoa. Fibra que regula glucemia y "
            "el tránsito (también de hormonas).\n\n"
            "🐟 Omega-3 — Sardinas, salmón, semillas de chía y lino. Antiinflamatorios.\n\n"
            "🍓 Frutos rojos — Antioxidantes, bajos en azúcar.\n\n"
            "🌰 Magnesio y zinc — Semillas, frutos secos, legumbres. Ayudan al sistema nervioso "
            "y al SPM.\n\n"
            "❌ A reducir (no eliminar):\n"
            "• Ultraprocesados y azúcar refinado: picos de insulina que afectan al ciclo.\n"
            "• Alcohol: el hígado lo prioriza por encima de metabolizar hormonas.\n"
            "• Restricciones extremas: el cuerpo bajo amenaza desordena el ciclo.\n\n"
            "Come variado, suficiente y disfrútalo: eso ya es muchísimo."
        ),
        "etiquetas": ["nutrición", "hormonas", "ciclo"],
    },
]
