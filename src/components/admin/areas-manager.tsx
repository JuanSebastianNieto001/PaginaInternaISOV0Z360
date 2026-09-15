"use client";

import { deleteArea, upsertArea } from "@/lib/actions/taxonomy.actions";
import type { Area } from "@/types";

import { TaxonomyListManager } from "./taxonomy-list-manager";

export interface AreaWithCount extends Area {
  document_count: number;
}

export function AreasManager({ areas }: { areas: AreaWithCount[] }) {
  return (
    <TaxonomyListManager
      items={areas}
      upsert={upsertArea}
      remove={deleteArea}
      labels={{
        cardTitle: "Áreas responsables",
        cardDescription: (n) =>
          `${n} áreas. Se asignan al subir un documento y sirven para filtrar el repositorio.`,
        newButton: "Nueva área",
        emptyTitle: "Sin áreas",
        emptyDescription: "Crea las áreas o cargos que serán dueños de la documentación.",
        newDialogTitle: "Nueva área",
        editDialogTitle: "Editar área",
        dialogDescription: "El nombre es lo que verán las personas al subir o filtrar documentos.",
        namePlaceholder: "Coordinador SST",
        codePlaceholder: "COORDINADOR_SST",
        descriptionPlaceholder: "Qué documentación gestiona esta área…",
        activeLabel: "Activa",
        activeDescription: "Las áreas inactivas no se ofrecen al subir documentos.",
        deleteDialogTitle: "Eliminar área",
        createdToast: "Área creada",
        updatedToast: "Área actualizada",
        deletedToast: "Área eliminada",
        fieldPrefix: "area",
      }}
    />
  );
}
