"use client";

import { useEffect, useRef, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { createStore, useStore } from "zustand";
import { Btn } from "@/components/owner/ui";
import {
  marketingHref,
  type FacebookChannel,
} from "@/domain/marketing/marketing";
import { container } from "@/infrastructure/composition/owner-web-container";

const marketing = container.marketing;
const connectedDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });
const channelNames = [
  "Facebook Pages",
  "Instagram professional accounts",
  "TikTok",
] as const;

export function MarketingPublishingDestinations() {
  return (
    <section className="marketing-composer-section">
      <h3>Publishing destinations</h3>
      <p className="marketing-muted">
        Save a draft for now. Scheduling is unavailable.
      </p>
      <ul className="marketing-destinations">
        {channelNames.map((name) => (
          <li key={name}>
            <span>{name}</span>
            <span>Publishing unavailable</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function facebookStatus(channel: FacebookChannel | null) {
  if (!channel) return "Status unavailable";
  if (channel.connection) return channel.connection.name;
  return channel.enabled ? "Not connected" : "Unavailable";
}

export function MarketingChannelSummary() {
  const status = useMemo(
    () =>
      createStore(() => ({
        channel: undefined as FacebookChannel | null | undefined,
      })),
    [],
  );
  const channel = useStore(status, (state) => state.channel);
  useEffect(() => {
    let active = true;
    void marketing.facebookChannel().then(
      (value) => {
        if (active) status.setState({ channel: value });
      },
      () => {
        if (active) status.setState({ channel: null });
      },
    );
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <section className="marketing-channel-summary">
      <div>
        <h2>Channels</h2>
        <p className="marketing-muted">
          Facebook Pages ·{" "}
          {channel === undefined
            ? "Checking connection…"
            : facebookStatus(channel)}
        </p>
      </div>
      <Link href={marketingHref("channels")}>Manage channels</Link>
    </section>
  );
}

function readFacebookCallback() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const state = params.get("state");
  if (!state && !params.has("invalid")) return null;
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + window.location.search,
  );
  return { state, code: params.get("code") };
}

function connectionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not update the Facebook connection.";
}

const createChannelStore = () =>
  createStore(() => ({
    channel: null as FacebookChannel | null,
    problem: "",
    notice: "",
    busy: true,
  }));

export function MarketingChannels() {
  const state = useRef<ReturnType<typeof createChannelStore> | null>(null);
  const store = (state.current ??= createChannelStore());
  const { channel, problem, notice, busy } = useStore(store);
  const mounted = useRef(false);
  const initial = useRef<Promise<{
    channel: FacebookChannel;
    notice: string;
    callbackProblem: string;
  }> | null>(null);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    initial.current ??= (async () => {
      const callback = readFacebookCallback();
      let notice = "";
      let callbackProblem = "";
      if (callback?.state) {
        try {
          const outcome = await marketing.completeFacebook(
            callback.state,
            callback.code,
          );
          if (outcome === "CANCELLED")
            notice = "Facebook connection was cancelled.";
          if (outcome === "NO_ELIGIBLE_PAGES")
            notice = "No eligible Facebook Pages were found. Check that you can create content on the Page and reconnect.";
        } catch (error) {
          callbackProblem = connectionError(error);
        }
      } else if (callback) {
        notice = "This Facebook connection attempt has expired. Start again.";
      }
      return { channel: await marketing.facebookChannel(), notice, callbackProblem };
    })();
    initial.current
      .then(({ channel, notice, callbackProblem }) => {
        if (!active) return;
        store.setState({ channel, notice, problem: callbackProblem });
      })
      .catch((error: unknown) => {
        if (active) store.setState({ problem: connectionError(error) });
      })
      .finally(() => {
        if (active) store.setState({ busy: false });
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [store]);

  async function update(action: () => Promise<void>) {
    if (store.getState().busy) return;
    store.setState({ busy: true, problem: "", notice: "" });
    try {
      await action();
    } catch (error) {
      store.setState({ problem: connectionError(error) });
    } finally {
      store.setState({ busy: false });
    }
  }

  const selection = channel?.selection;
  function select(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pageId = new FormData(event.currentTarget).get("page");
    if (!selection || typeof pageId !== "string") return;
    void update(async () => {
      const channel = await marketing.selectFacebook(selection.id, pageId);
      store.setState({ channel, notice: "Facebook Page connected." });
    });
  }

  return (
    <section aria-label="Publishing channels">
      <h2>Connected Channels</h2>
      <ul className="marketing-channel-list">
        <li>
          <div>
            <strong>{channelNames[0]}</strong>
            {channel?.connection && (
              <p className="marketing-muted">
                Connected{" "}
                {connectedDate.format(new Date(channel.connection.connectedAt))}
                . Token health is unavailable.
              </p>
            )}
          </div>
          <span>
            {channel
              ? facebookStatus(channel)
              : busy
                ? "Checking…"
                : "Status unavailable"}
          </span>
        </li>
        {channelNames.slice(1).map((name) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>Not available yet</span>
          </li>
        ))}
      </ul>
      <p className="marketing-muted">
        Publishing posts and reels is unavailable for all channels.
      </p>
      {notice && (
        <p className="marketing-notice" role="status">
          {notice}
        </p>
      )}
      {problem && (
        <p className="marketing-error" role="alert">
          {problem}
        </p>
      )}
      {!channel && busy && <p role="status">Loading Facebook connection…</p>}
      {!channel && problem && (
        <Btn
          disabled={busy}
          onClick={() =>
            void update(async () =>
              store.setState({ channel: await marketing.facebookChannel() }),
            )
          }
        >
          Try again
        </Btn>
      )}
      {channel?.enabled && (
        <div className="marketing-facebook-actions">
          {selection && (
            <form
              key={selection.id}
              onSubmit={select}
              className="marketing-facebook-picker"
            >
              <label htmlFor="facebook-page">Choose a Facebook Page</label>
              <select
                id="facebook-page"
                name="page"
                disabled={busy}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select a Page
                </option>
                {selection.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
              <Btn type="submit" disabled={busy}>
                Connect Page
              </Btn>
            </form>
          )}
          {!selection && (
            <Btn
              disabled={busy}
              onClick={() =>
                void update(async () => {
                  const url = await marketing.startFacebook();
                  if (mounted.current) window.location.assign(url);
                })
              }
            >
              {channel.connection ? "Reconnect Facebook" : "Connect Facebook"}
            </Btn>
          )}
          {channel.connection && (
            <Btn
              disabled={busy}
              onClick={() =>
                void update(async () => {
                  await marketing.disconnectFacebook();
                  store.setState({
                    channel: await marketing.facebookChannel(),
                  });
                  store.setState({ notice: "Facebook Page disconnected." });
                })
              }
            >
              Disconnect Facebook
            </Btn>
          )}
          {selection && !channel.connection && (
            <button
              type="button"
              className="marketing-text-button"
              disabled={busy}
              onClick={() =>
                void update(async () => {
                  await marketing.disconnectFacebook();
                  store.setState({
                    channel: await marketing.facebookChannel(),
                  });
                })
              }
            >
              Cancel
            </button>
          )}
        </div>
      )}
      {channel && !channel.enabled && (
        <p className="marketing-muted">
          Facebook setup is unavailable in this environment.
        </p>
      )}
    </section>
  );
}
