import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PrazoDoCodigo } from "./PrazoDoCodigo";

const MIN = 60_000;
const ENVIO = new Date(2026, 10, 4, 12, 0, 0).getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(ENVIO);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function avancar(minutos: number) {
  act(() => {
    vi.advanceTimersByTime(minutos * MIN);
  });
}

describe("PrazoDoCodigo", () => {
  it("no começo só mostra até que horas o código vale, sem aviso nem botão", () => {
    render(<PrazoDoCodigo enviadoEm={ENVIO} aoPedirMaisTempo={() => {}} podePedir />);

    expect(screen.getByText(/vale até às 12:15/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("quando faltam 3 minutos, avisa uma vez e oferece mais tempo", () => {
    const aoPedir = vi.fn();
    render(<PrazoDoCodigo enviadoEm={ENVIO} aoPedirMaisTempo={aoPedir} podePedir />);

    avancar(12);

    expect(screen.getByRole("status")).toHaveTextContent(/Faltam cerca de 3 minutos para o código vencer/);
    fireEvent.click(screen.getByRole("button", { name: /Preciso de mais tempo/ }));
    expect(aoPedir).toHaveBeenCalledTimes(1);
  });

  it("depois do prazo, diz que venceu e mantém o botão para pedir outro", () => {
    render(<PrazoDoCodigo enviadoEm={ENVIO} aoPedirMaisTempo={() => {}} podePedir />);

    avancar(16);

    expect(screen.getByText(/Este código venceu às 12:15/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/O código venceu\. Peça outro para continuar/);
    expect(screen.getByRole("button", { name: /Preciso de mais tempo/ })).toBeEnabled();
  });

  it("com a espera do servidor em andamento, o botão fica desabilitado e explica por quê", () => {
    render(<PrazoDoCodigo enviadoEm={ENVIO} aoPedirMaisTempo={() => {}} podePedir={false} />);

    avancar(13);

    expect(screen.getByRole("button", { name: /Preciso de mais tempo/ })).toBeDisabled();
    expect(screen.getByText(/espera um minuto entre um envio e outro/)).toBeInTheDocument();
  });

  it("um código novo recomeça a conta e some o aviso", () => {
    const { rerender } = render(<PrazoDoCodigo enviadoEm={ENVIO} aoPedirMaisTempo={() => {}} podePedir />);
    avancar(13);
    expect(screen.getByRole("button", { name: /Preciso de mais tempo/ })).toBeInTheDocument();

    rerender(<PrazoDoCodigo enviadoEm={Date.now()} aoPedirMaisTempo={() => {}} podePedir />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/vale até às 12:28/)).toBeInTheDocument();
  });
});
