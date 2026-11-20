import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// histórico real sem mock A linha abre o log
// solver só com sequência de ações — registro antigo cai na linha-resumo
// sem quebrar. A sidebar é lista só-leitura e nunca trava a vez do herói
// (mesmo trato do Predict: trava botões + congela o relógio).
const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');

describe('histórico real (sem mock)', () => {
  it('MOCK_HANDS não existe mais em engine nem página', () => {
    expect(src('engine/profileStats.js')).not.toContain('MOCK_HANDS');
    expect(src('components/pages/profile.vue')).not.toContain('MOCK_HANDS');
    expect(src('components/pages/profile.vue')).not.toContain('mock preview');
  });

  it('HandRow compartilhada: botão só com lines, div sem', () => {
    const row = src('components/HandRow.vue');
    expect(row).toContain(":is=\"canOpen ? 'button' : 'div'\"");
    expect(row).toContain('canOpen');
    expect(row).toContain("emit('open', hand)");
  });

  it('profile: linha abre modal solver com copy', () => {
    const page = src('components/pages/profile.vue');
    expect(page).toContain('formatHandHistory');
    expect(page).toContain('formatHandMTT');
    expect(page).toContain('Copy MTT');
    expect(page).toContain('selectedText');
    expect(page).toContain('navigator.clipboard.writeText');
    expect(page).toContain('@click.self="selectedHand = null"');
  });

  it('sidebar: lista só-leitura, drawer trava botões + relógio como o Predict', () => {
    const side = src('components/HandSidebar.vue');
    expect(side).toContain(':openable="false"');
    expect(side).toContain("emit('close')");
    const play = src('components/pages/play.vue');
    expect(play).toContain('sidebarOpen');
    // Dock desktop é não-modal só o drawer mobile
    // bloqueia — `sidebarBlocks`, não `sidebarOpen` cru.
    expect(play).toContain('predictOpen || sidebarBlocks');
    expect(play).toContain('setSidebarOpen');
  });
});
