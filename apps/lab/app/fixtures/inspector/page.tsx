'use client';

import { useState } from 'react';

export default function InspectorFixturePage() {
  const [count, setCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('Sin guardar');

  return (
    <main>
      <h1>Inspector Exit Fixture</h1>
      <section className="fixture-card" aria-label="Acciones de prueba">
        <button type="button" data-testid="target-action" onClick={() => setCount((value) => value + 1)}>
          Target action
        </button>
        <output data-testid="target-count">{count}</output>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="fixture-details"
          onClick={() => setExpanded((value) => !value)}
        >
          Toggle details
        </button>
        <div id="fixture-details" hidden={!expanded}>
          Estado expandido observable.
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setStatus('Guardado');
          }}
        >
          <label>
            Nombre
            <input name="name" required defaultValue="dato privado de prueba" />
          </label>
          <button type="submit">Guardar</button>
        </form>
        <p role="status">{status}</p>
      </section>
    </main>
  );
}
