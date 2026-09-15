"use client";

import { deleteProcess, upsertProcess } from "@/lib/actions/taxonomy.actions";
import type { Process } from "@/types";

import { TaxonomyListManager } from "./taxonomy-list-manager";

export interface ProcessWithCount extends Process {
  document_count: number;
}

export function ProcessesManager({ processes }: { processes: ProcessWithCount[] }) {
  return (
    <TaxonomyListManager
      items={processes}
      upsert={upsertProcess}
      remove={deleteProcess}
      labels={{
        cardTitle: "Procesos del SGI",
        cardDescription: (n) =>
          `${n} procesos. Es el campo "Proceso / Área" del listado maestro y el filtro principal del repositorio.`,
        newButton: "Nuevo proceso",
        emptyTitle: "Sin procesos",
        emptyDescription: "Crea los procesos del sistema de gestión integrado.",
        newDialogTitle: "Nuevo proceso",
        editDialogTitle: "Editar proceso",
        dialogDescription: "El nombre es lo que verán las personas al subir o filtrar documentos.",
        namePlaceholder: "AUD: Auditoría Interna",
        codePlaceholder: "AUD",
        descriptionPlaceholder: "Qué documentación pertenece a este proceso…",
        activeLabel: "Activo",
        activeDescription: "Los procesos inactivos no se ofrecen al subir documentos.",
        deleteDialogTitle: "Eliminar proceso",
        createdToast: "Proceso creado",
        updatedToast: "Proceso actualizado",
        deletedToast: "Proceso eliminado",
        fieldPrefix: "process",
      }}
    />
  );
}
