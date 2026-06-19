"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Projet, StatusKey } from "@/lib/types";
import { PROJECT_TYPE_LABEL, STATUS } from "@/lib/status";

// Couleurs d'état (hex) — alignées sur la charte §3.3.
const STATE_HEX: Record<StatusKey, string> = {
  ontime: "#2E9E5B",
  risk: "#E8A317",
  late: "#D64550",
  done: "#2E6FB7",
  paused: "#98A2B3",
};

// Carte interactive OpenStreetMap / Leaflet (BF-10, choix techno §8).
export default function MapView({ projets }: { projets: Projet[] }) {
  return (
    <MapContainer
      center={[5.6, 12.4]}
      zoom={6}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {projets.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: STATE_HEX[p.statut],
            fillOpacity: 1,
          }}
        >
          <Tooltip>{p.intitule}</Tooltip>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold text-[#1D2433]">{p.intitule}</p>
              <p className="text-xs text-[#475467]">
                {p.region} · {PROJECT_TYPE_LABEL[p.type]} · {STATUS[p.statut].label}
              </p>
              <p className="text-xs text-[#475467]">Avancement : {p.avancement}%</p>
              <Link href={`/projets/${p.id}`} className="text-xs font-medium text-[#2E6FB7] underline">
                Voir le projet →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
