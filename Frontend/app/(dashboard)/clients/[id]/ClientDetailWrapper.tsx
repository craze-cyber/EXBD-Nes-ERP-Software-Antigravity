"use client";

import dynamic from "next/dynamic";

const ClientDetail = dynamic(() => import("./ClientDetail"), { ssr: false });

export default function ClientDetailWrapper() {
  return <ClientDetail />;
}
