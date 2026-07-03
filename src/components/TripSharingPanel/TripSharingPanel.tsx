"use client";

import { useState, useRef } from "react";
import { Lock, Users, X, Loader2, Search } from "lucide-react";
import type { TripCollaborator } from "@/types/trip";
import type { TripSharingPanelProps } from "./TripSharingPanel.types";
import { getInitials } from "./TripSharingPanel.utils";
import styles from "./TripSharingPanel.module.css";

interface UserResult {
  _id: string;
  name: string;
  email: string;
}

export function TripSharingPanel({ trip, token, onTripUpdate }: TripSharingPanelProps) {
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [privacyError, setPrivacyError]       = useState<string | null>(null);

  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<UserResult[]>([]);
  const [searching, setSearching]           = useState(false);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [inviting, setInviting]             = useState(false);
  const [inviteError, setInviteError]       = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handlePrivacyToggle() {
    const next = !trip.isPrivate;
    onTripUpdate({ ...trip, isPrivate: next });
    setTogglingPrivacy(true);
    setPrivacyError(null);
    try {
      const res = await fetch(`/api/trips/${trip._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPrivate: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        onTripUpdate(updated);
      } else {
        onTripUpdate({ ...trip, isPrivate: trip.isPrivate });
        setPrivacyError("Could not update privacy setting. Please try again.");
      }
    } catch {
      onTripUpdate({ ...trip, isPrivate: trip.isPrivate });
      setPrivacyError("Could not update privacy setting. Please try again.");
    } finally {
      setTogglingPrivacy(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    setInviteError(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (q.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(q.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const all: UserResult[] = await res.json();
          const addedIds = new Set((trip.collaborators ?? []).map((c) => c.userId));
          setSearchResults(all.filter((u) => !addedIds.has(u._id)));
          setDropdownOpen(true);
        }
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSearchFocus() {
    if (searchResults.length > 0) setDropdownOpen(true);
  }

  function handleSearchBlur() {
    setTimeout(() => setDropdownOpen(false), 150);
  }

  async function handleSelect(user: UserResult) {
    setDropdownOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setInviting(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/trips/${trip._id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email }),
      });
      const json = await res.json();
      if (res.ok) {
        onTripUpdate(json);
      } else {
        setInviteError(json.error ?? "Something went wrong.");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(collaborator: TripCollaborator) {
    const snapshot = trip.collaborators;
    onTripUpdate({ ...trip, collaborators: trip.collaborators.filter((c) => c.userId !== collaborator.userId) });

    try {
      const res = await fetch(`/api/trips/${trip._id}/collaborators/${collaborator.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        onTripUpdate(updated);
      } else {
        onTripUpdate({ ...trip, collaborators: snapshot });
      }
    } catch {
      onTripUpdate({ ...trip, collaborators: snapshot });
    }
  }

  const collaborators = trip.collaborators ?? [];

  return (
    <section className={styles.panel} aria-label="Sharing & Privacy">
      {/* Header */}
      <div className={styles.header}>
        <Lock size={18} className={styles.headerIcon} aria-hidden="true" />
        <h2 className={styles.title}>Sharing &amp; Privacy</h2>
      </div>

      {/* Privacy toggle row */}
      <div className={styles.privacyRow}>
        <div className={styles.privacyLeft}>
          <span className={styles.privacyLabel}>Private trip</span>
          <span className={styles.privacyHelper}>
            Only you and editors can see this trip
          </span>
          {privacyError && (
            <span className={styles.privacyError} role="alert">{privacyError}</span>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={trip.isPrivate}
          aria-label="Private trip"
          className={[
            styles.toggle,
            trip.isPrivate  ? styles.toggleOn      : "",
            togglingPrivacy ? styles.toggleLoading  : "",
          ].join(" ")}
          onClick={handlePrivacyToggle}
          disabled={togglingPrivacy}
        >
          {togglingPrivacy && (
            <Loader2 size={12} className={styles.toggleSpinner} aria-hidden="true" />
          )}
        </button>
      </div>

      <hr className={styles.divider} />

      {/* Editors sub-heading */}
      <p className={styles.editorsLabel}>
        Editors{collaborators.length > 0 ? ` (${collaborators.length})` : ""}
      </p>

      {/* Collaborator list */}
      {collaborators.length === 0 ? (
        <p className={styles.emptyEditors}>No editors yet</p>
      ) : (
        <ul className={styles.collaboratorList} aria-label="Editors list">
          {collaborators.map((c) => (
            <li key={c.userId} className={styles.collaboratorRow}>
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(c.name)}
              </div>
              <div className={styles.collaboratorInfo}>
                <span className={styles.collaboratorName}>{c.name}</span>
                <span className={styles.collaboratorEmail}>{c.email}</span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Remove ${c.name}`}
                onClick={() => handleRemove(c)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add collaborator — searchable combo-box */}
      <div className={styles.searchWrapper}>
        <label htmlFor="collaboratorSearch" className={styles.srOnly}>
          Search users to add as editors
        </label>
        <div className={styles.searchInputWrapper}>
          <Search size={15} className={styles.searchIcon} aria-hidden="true" />
          <input
            id="collaboratorSearch"
            type="text"
            className={[styles.searchInput, inviteError ? styles.searchInputError : ""].join(" ")}
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            disabled={inviting}
            autoComplete="off"
            aria-describedby={inviteError ? "inviteError" : undefined}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            role="combobox"
            aria-controls="collaboratorDropdown"
            aria-autocomplete="list"
          />
          {(searching || inviting) && (
            <Loader2 size={14} className={styles.searchSpinner} aria-hidden="true" />
          )}
        </div>

        {dropdownOpen && searchResults.length > 0 && (
          <ul
            id="collaboratorDropdown"
            role="listbox"
            aria-label="Matching users"
            className={styles.dropdown}
          >
            {searchResults.map((u) => (
              <li
                key={u._id}
                role="option"
                aria-selected="false"
                className={styles.dropdownItem}
                onMouseDown={() => handleSelect(u)}
              >
                <div className={styles.dropdownAvatar} aria-hidden="true">
                  {getInitials(u.name)}
                </div>
                <div className={styles.dropdownInfo}>
                  <span className={styles.dropdownName}>{u.name}</span>
                  <span className={styles.dropdownEmail}>{u.email}</span>
                </div>
                <span className={styles.dropdownAddHint}>
                  <Users size={12} aria-hidden="true" />
                  Add
                </span>
              </li>
            ))}
          </ul>
        )}

        {dropdownOpen && !searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <div className={styles.dropdownEmpty}>
            No registered users found for &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {inviteError && (
        <p id="inviteError" role="alert" className={styles.inviteError}>
          {inviteError}
        </p>
      )}
    </section>
  );
}
