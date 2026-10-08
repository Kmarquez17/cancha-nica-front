import { cn } from '@/shared/lib/utils';
import type { AdminFichaDto, ConteosClienteDto } from '@/shared/api/generated/models';
import { fechaCorta, textoConteo } from '../lib/formato';

const ESTADO_ADMIN: Record<AdminFichaDto['estado'], { texto: string; clase: string }> = {
  ACTIVO: { texto: 'Activo', clase: 'bg-primary/10 text-primary' },
  INACTIVO: { texto: 'Inactivo', clase: 'bg-muted text-muted-foreground' },
  INVITACION_PENDIENTE: {
    texto: 'Invitación pendiente',
    clase: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
};

/** Admins del cliente (sin el dueño). Solo lectura. */
export function TablaAdmins({ admins }: { admins: AdminFichaDto[] }) {
  if (admins.length === 0) {
    return <p className="text-muted-foreground">Este cliente todavía no tiene admins.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Admins del cliente</caption>
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Nombre
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Correo
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Estado
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Desde
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => {
            const estado = ESTADO_ADMIN[admin.estado];
            return (
              // `id` es null mientras es solo una invitación: el correo identifica la fila.
              <tr key={admin.id ?? `inv-${admin.email}`} className="border-t">
                <td className="px-3 py-2">{admin.nombre}</td>
                <td className="px-3 py-2">{admin.email}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      estado.clase,
                    )}
                  >
                    {estado.texto}
                  </span>
                  {admin.estado === 'INVITACION_PENDIENTE' && admin.expiraEn ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Vence {fechaCorta(admin.expiraEn)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{fechaCorta(admin.desde)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ficha({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-sm text-muted-foreground">{titulo}</dt>
      <dd className="mt-1 text-2xl font-semibold">{valor}</dd>
      {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  );
}

/**
 * Fichas de conteos de solo lectura. `null`/ausente = «aún no disponible» y se pinta «—», NUNCA 0.
 * Categorías, Ligas, Mesas, Delegados y Equipos son los espacios preparados: se llenan solos cuando
 * el API empieza a devolver su conteo (Fases 2 y 3).
 */
export function ConteosCliente({ conteos }: { conteos: ConteosClienteDto }) {
  const preparados: { titulo: string; valor: number | null | undefined }[] = [
    { titulo: 'Categorías', valor: conteos.categorias },
    { titulo: 'Ligas', valor: conteos.ediciones },
    { titulo: 'Mesas', valor: conteos.mesas },
    { titulo: 'Delegados', valor: conteos.delegados },
    { titulo: 'Equipos', valor: conteos.equipos },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Ficha titulo="Admins" valor={textoConteo(conteos.admins)} />
      <Ficha titulo="Admins activos" valor={textoConteo(conteos.adminsActivos)} />
      <Ficha
        titulo="Invitaciones de admin pendientes"
        valor={textoConteo(conteos.invitacionesAdminPendientes)}
      />
      {preparados.map(({ titulo, valor }) => (
        <Ficha
          key={titulo}
          titulo={titulo}
          valor={textoConteo(valor)}
          nota={valor == null ? 'Aún no disponible' : undefined}
        />
      ))}
    </dl>
  );
}
