// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * «¿Con qué suena la capa?»: la biblioteca de sonidos de UNA capa.
 *
 * Se abre al tocar el nombre de una capa (o con «Añadir capa», para una
 * nueva). Arriba, grabarlo uno mismo; luego los grupos en pestañas —lo de
 * ustedes primero— y una rejilla ordenada. Tocar un sonido lo hace sonar y
 * lo deja escogido; abajo se ve el cambio («Caja seca → Palmas») y se
 * guarda con un botón claro.
 */
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useVistaPrevia, vistaPrevia } from '../audio/vistaPrevia';
import { SONOTECA } from '../audio/sonoteca';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { formatearReloj, NOMBRES_SONIDO, nuevoId } from '../estado/proyecto';
import { agregarPista, ponerSonido, quitarPista, valorSonido } from '../estado/musica';
import type { Proyecto, TipoSonido } from '../estado/tipos';
import { Ventana } from '../componentes/Ventana';
import { Recortador } from '../componentes/Recortador';
import { useEnDemo } from '../componentes/demo';
import { useEnVentana } from '../nube/Caras';
import { SelectorInstrumento } from './SelectorInstrumento';
import { ID_MELODIA, PISTA_NUEVA } from './VentanaSonidosPistas';
import { Icono } from './Icono';

const KIT: TipoSonido[] = ['bombo', 'redoblante', 'hihat', 'palma', 'tom', 'aro'];

interface Sonido {
  valor: string;
  nombre: string;
  nota: string;
  url?: string;
}

type Grupo = { id: string; titulo: string; sonidos: Sonido[] };

function gruposDe(p: Proyecto): Grupo[] {
  const sonoteca = (g: string, nota: string) =>
    SONOTECA.filter((s) => s.grupo === g).map((s) => ({ valor: `sonoteca:${s.id}`, nombre: s.nombre, nota, url: s.url }));
  return [
    { id: 'tuyos', titulo: 'Tuyos', sonidos: p.sonidos.map((s) => ({ valor: `propio:${s.id}`, nombre: s.nombre, nota: `grabado · ${formatearReloj(s.duracion)}`, url: s.url })) },
    { id: 'bateria', titulo: 'Batería', sonidos: KIT.map((t) => ({ valor: t, nombre: NOMBRES_SONIDO[t], nota: 'batería' })) },
    { id: 'biblioteca', titulo: 'Hechos en SONORA', sonidos: sonoteca('biblioteca', 'hecho en SONORA') },
    { id: 'percusion', titulo: 'Percusión', sonidos: sonoteca('percusion', 'percusión') },
    { id: 'ciudad', titulo: 'Ciudad', sonidos: sonoteca('ciudad', 'ciudad') },
    { id: 'melodico', titulo: 'Melodías', sonidos: sonoteca('melodico', 'para melodías') },
  ];
}

/** El nombre de lo que suena hoy en una capa, para «Caja seca → Palmas». */
function nombreDeValor(p: Proyecto, valor: string): string {
  if (valor.startsWith('sonoteca:')) return SONOTECA.find((s) => `sonoteca:${s.id}` === valor)?.nombre ?? 'un sonido';
  if (valor.startsWith('propio:')) return p.sonidos.find((s) => `propio:${s.id}` === valor)?.nombre ?? 'tu sonido';
  return NOMBRES_SONIDO[valor as TipoSonido] ?? 'un sonido';
}

interface Props {
  /** La capa (id de la fila), la melodía, o PISTA_NUEVA para agregar una. */
  pista: string;
  alCerrar: () => void;
  /** Abre la grabadora; con archivo, ya subido. */
  alGrabar: (archivo?: { url: string; nombre: string }) => void;
}

export function VentanaSonidosCapa({ pista, alCerrar, alGrabar }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const demo = useEnDemo();
  const { filas } = proyecto.patron;
  const [id, setId] = useState(pista);
  const nueva = id === PISTA_NUEVA;
  const melodia = id === ID_MELODIA;
  const fila = filas.find((f) => f.id === id);
  useEnVentana(`sonidos:${id}`);
  const actual = fila ? valorSonido(proyecto, fila.tipo, fila.sampleUrl) : '';
  const grupos = gruposDe(proyecto);
  const inicial = grupos.find((g) => g.sonidos.some((s) => s.valor === actual))?.id ?? (proyecto.sonidos.length > 0 ? 'tuyos' : 'bateria');
  const [grupo, setGrupo] = useState(inicial);
  const [candidato, setCandidato] = useState<Sonido | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const nombreCapa = nueva ? 'la capa nueva' : melodia ? 'la Melodía' : `«${fila?.nombre ?? ''}»`;
  const visibles = grupos.find((g) => g.id === grupo) ?? grupos[0];

  const probar = (s: Sonido) => {
    setCandidato(s);
    setAviso(null);
    if (demo) return;
    vistaPrevia.parar();
    if (s.url) vistaPrevia.oir(`url:${s.url}`, s.url);
    else vistaPrevia.golpe(`tipo:${s.valor}`, () => void motorAudio.probarTipo(s.valor as TipoSonido));
  };

  const guardar = (s: Sonido) => {
    let nuevoIdCapa = id;
    if (nueva) {
      actualizar((p) => (nuevoIdCapa = agregarPista(p, s.valor)));
      window.setTimeout(() => setId(nuevoIdCapa), 0);
      setAviso(`✓ Nueva capa con ${s.nombre}. Toquen sus casillas para que suene.`);
    } else {
      actualizar((p) => ponerSonido(p, id, s.valor));
      setAviso(`✓ ${fila?.nombre ?? 'La capa'} ahora suena con ${s.nombre}, en toda la obra.`);
    }
    setCandidato(null);
  };

  /** Usar solo un pedazo del sonido escogido: el recorte queda en «Tuyos» y entra en la capa. */
  const guardarRecorte = (s: Sonido, recorte: Blob, duracion: number) => {
    const url = crearUrl(recorte);
    const idSonido = nuevoId('sonido');
    const nombre = `${s.nombre.slice(0, 14)} ✂`;
    let nuevoIdCapa = id;
    actualizar((p) => {
      p.sonidos.push({ id: idSonido, nombre, url, duracion });
      if (nueva) nuevoIdCapa = agregarPista(p, `propio:${idSonido}`);
      else ponerSonido(p, id, `propio:${idSonido}`);
    });
    if (nueva) window.setTimeout(() => setId(nuevoIdCapa), 0);
    setAviso(`✓ ${nueva ? 'Nueva capa' : (fila?.nombre ?? 'La capa')} con un pedazo de ${s.nombre}. Quedó también en «Tuyos».`);
    setCandidato(null);
  };

  const subir = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    alGrabar({ url: crearUrl(f), nombre: f.name.replace(/\.[^.]+$/, '').slice(0, 18) });
    ev.target.value = '';
  };

  const titulo = nueva ? '¿Qué capa añaden?' : melodia ? '¿Con qué suena la Melodía?' : `¿Con qué suena ${fila?.nombre ?? 'la capa'}?`;

  return (
    <Ventana titulo={titulo} nota="Toquen un sonido para oírlo. Si les gusta, guárdenlo en la capa." color={fila?.color} ancha alta alCerrar={alCerrar} guia="ventana-sonidos">
      <div className="nv nv--incrustado nv-biblio" data-bloqueo={`sonido:${id}`}>
        {melodia ? (
          <>
            <p className="nv-tenue nv-chico">La melodía afina el sonido en cada casilla de la matriz. Sirve cualquiera: uno de la app o un efecto suyo.</p>
            <SelectorInstrumento />
          </>
        ) : (
          <>
            <div className="nv-grabalo">
              <span className="nv-grabalo__icono">
                <Icono n="microphone-fill" tam={20} />
              </span>
              <span className="nv-grabalo__textos">
                <strong>¿No está el que buscan? Grábenlo</strong>
                <span>Una reja, una olla, un pito… lo graban, lo recortan y queda en {nombreCapa}.</span>
              </span>
              <button type="button" className="nv-boton nv-boton--rojo" onClick={() => alGrabar()}>
                <Icono n="microphone-fill" tam={14} /> Grabar
              </button>
              <label className="nv-boton">
                <Icono n="upload-simple-bold" tam={14} /> Subir archivo
                <input type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a" hidden onChange={subir} />
              </label>
            </div>

            <div className="nv-biblio__grupos" role="tablist" aria-label="Grupos de sonidos">
              {grupos.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={g.id === visibles.id}
                  className={`nv-biblio__grupo ${g.id === visibles.id ? 'nv-biblio__grupo--activo' : ''}`}
                  onClick={() => setGrupo(g.id)}
                >
                  {g.id === 'tuyos' && <Icono n="microphone-fill" tam={12} />}
                  {g.titulo}
                  <span className="nv-biblio__cuantos">{g.sonidos.length}</span>
                </button>
              ))}
            </div>

            <div className="nv-biblio__rejilla">
              {visibles.sonidos.length === 0 && (
                <p className="nv-tenue nv-chico nv-biblio__vacio">
                  Aquí llega lo que graben: en el recorrido, en Voz o con «Grabar». Todavía no hay nada.
                </p>
              )}
              {visibles.sonidos.map((s) => (
                <FichaSonido key={s.valor} sonido={s} activa={actual === s.valor} escogida={candidato?.valor === s.valor} alTocar={() => probar(s)} />
              ))}
            </div>
          </>
        )}

        {!melodia && (
          <div className={`nv-biblio__pie ${candidato ? 'nv-biblio__pie--listo' : ''}`}>
            {candidato ? (
              <>
                <span className="nv-biblio__cambio">
                  {!nueva && fila && (
                    <>
                      <span className="nv-biblio__chip">{nombreDeValor(proyecto, actual)}</span>
                      <Icono n="arrow-right-bold" tam={13} />
                    </>
                  )}
                  <span className="nv-biblio__chip nv-biblio__chip--nuevo">{candidato.nombre}</span>
                  <span className="nv-tenue nv-chico">{nueva ? 'será una capa nueva' : 'cambia en toda la obra'}</span>
                </span>
                <span className="nv-espacio" />
                <button type="button" className="nv-boton" onClick={() => setCandidato(null)}>
                  Cancelar
                </button>
                <button type="button" className="nv-boton nv-boton--primario" onClick={() => guardar(candidato)}>
                  <Icono n="check-bold" tam={14} /> {nueva ? 'Añadir capa' : `Guardar en ${fila?.nombre ?? 'la capa'}`}
                </button>
                {/* La onda del sonido escogido; si solo sirve un pedazo, se recorta aquí mismo. */}
                <div className="nv-biblio__onda">
                  {candidato.url ? (
                    <>
                      <span className="nv-biblio__onda-titulo">
                        <Icono n="waveform-bold" tam={14} /> Su onda · si solo quieren un pedazo, muevan los bordes verdes
                      </span>
                      <Recortador
                        key={candidato.url}
                        url={candidato.url}
                        entero
                        textoGuardar={`✂ Recortar y ${nueva ? 'añadir capa' : `guardar en ${fila?.nombre ?? 'la capa'}`}`}
                        alGuardar={(recorte, duracion) => guardarRecorte(candidato, recorte, duracion)}
                      />
                    </>
                  ) : (
                    <span className="nv-tenue nv-chico">Es un sonido de la batería de la app: suena siempre igual y no tiene onda para recortar.</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="nv-tenue nv-chico">{aviso ?? 'Toquen un sonido para oírlo.'}</span>
                <span className="nv-espacio" />
                {fila && filas.length > 1 && (
                  <button
                    type="button"
                    className="nv-enlace nv-chico nv-rojo"
                    onClick={() => {
                      actualizar((p) => quitarPista(p, fila.id));
                      alCerrar();
                    }}
                  >
                    Quitar esta capa
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Ventana>
  );
}

function FichaSonido({ sonido, activa, escogida, alTocar }: { sonido: Sonido; activa: boolean; escogida: boolean; alTocar: () => void }) {
  const { suena } = useVistaPrevia();
  const sonando = suena(sonido.url ? `url:${sonido.url}` : `tipo:${sonido.valor}`);
  return (
    <button
      type="button"
      className={`nv-ficha-son ${activa ? 'nv-ficha-son--activa' : ''} ${escogida ? 'nv-ficha-son--escogida' : ''}`}
      onClick={alTocar}
      aria-pressed={escogida}
    >
      <span className="nv-ficha-son__icono">
        <Icono n={sonando ? 'stop-fill' : activa ? 'check-bold' : 'waveform-bold'} tam={18} />
      </span>
      <span className="nv-ficha-son__textos">
        <strong>{sonido.nombre}</strong>
        <span>{sonando ? 'sonando…' : activa ? 'suena ahora en la capa' : sonido.nota}</span>
      </span>
    </button>
  );
}
