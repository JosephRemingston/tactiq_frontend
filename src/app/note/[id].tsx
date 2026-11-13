import { oneOf } from '@/security/validate';
import { guardParams } from '@/components/ParamGuard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { useNote, useNoteMutations } from '@/api/hooks';
import type { NoteSubject } from '@/api/types';
import { QueryBoundary } from '@/components/QueryBoundary';
import { NotFound, SignedOutCard } from '@/components/states';
import { SubjectHeader } from '@/components/SubjectHeader';
import { fmtRelative } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from '@/ui/Button';
import { Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { useOverlay } from '@/ui/overlay';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Editor({ noteId, subjectType, subjectId, initial, updatedAt }: { noteId: string | null; subjectType: NoteSubject; subjectId: string; initial: string; updatedAt?: string }) {
  const { c } = useTheme();
  const m = useNoteMutations();
  const { confirm, snack } = useOverlay();
  const [body, setBody] = useState(initial);
  const [id, setId] = useState<string | null>(noteId);
  const [state, setState] = useState<SaveState>(noteId ? 'saved' : 'idle');
  const [savedAt, setSavedAt] = useState(updatedAt);
  const last = useRef(initial);

  // Autosave 800 ms after typing stops.
  useEffect(() => {
    const text = body.trim();
    if (text === last.current.trim() || !text) return;
    const t = setTimeout(async () => {
      setState('saving');
      try {
        if (id) {
          const r = await m.update.mutateAsync({ id, body: text });
          setSavedAt(r.note.updatedAt);
        } else {
          const r = await m.create.mutateAsync({ subjectType, subjectId, body: text });
          setId(r.note.id);
          setSavedAt(r.note.updatedAt);
          router.setParams({ id: r.note.id });
        }
        last.current = text;
        setState('saved');
      } catch {
        setState('error');
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const status =
    state === 'saving' ? { icon: 'sync', text: 'Saving…' } : state === 'saved' ? { icon: 'cloud_done', text: `Saved ${fmtRelative(savedAt)}` } : state === 'error' ? { icon: 'error', text: "Couldn't save. Keep typing to retry." } : { icon: 'edit', text: 'Saves as you type' };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen
        header={
          <TopBar
            title={id ? 'Note' : 'New note'}
            actions={
              id ? (
                <IconButton
                  icon="delete"
                  label="Delete note"
                  color={c.error}
                  onPress={() =>
                    confirm({
                      title: 'Delete this note?',
                      body: "This can't be undone.",
                      confirm: 'Delete',
                      destructive: true,
                      onConfirm: () =>
                        m.remove.mutate(id, {
                          onSuccess: () => {
                            snack('Note deleted');
                            router.back();
                          },
                        }),
                    })
                  }
                />
              ) : null
            }
          />
        }>
        <Stack gap={16}>
          <SubjectHeader type={subjectType} id={subjectId} />
          <TextField
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={4000}
            counter
            placeholder="What did you notice?"
            autoFocus={!id}
            style={{ minHeight: 260 }}
            accessibilityLabel="Note text"
          />
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={status.icon} size={16} color={state === 'error' ? c.error : c.muted} />
            <T v="caption" color={state === 'error' ? 'error' : 'muted'}>
              {status.text}
            </T>
          </View>
          <View style={{ height: 40 }} />
        </Stack>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Screen 33, Note editor: subject header, up to 4,000 characters, autosave, delete. */
function NoteEditor() {
  const p = useLocalSearchParams<{ id: string; subjectType?: NoteSubject; subjectId?: string }>();
  const signedIn = useSignedIn();
  const isNew = p.id === 'new';
  const q = useNote(isNew ? undefined : p.id);
  if (!signedIn)
    return (
      <Screen header={<TopBar title="Note" />}>
        <SignedOutCard body="Notes are private to your account." />
      </Screen>
    );
  const subjectType = oneOf<NoteSubject | ''>(p.subjectType, ['match', 'team', 'player', 'insight'], '');
  if (isNew && subjectType && p.subjectId) return <Editor noteId={null} subjectType={subjectType} subjectId={p.subjectId} initial="" />;
  if (isNew)
    return (
      <Screen header={<TopBar title="Note" />}>
        <NotFound />
      </Screen>
    );
  const note = q.data?.note;
  if (note) return <Editor key={note.id} noteId={note.id} subjectType={note.subjectType} subjectId={note.subjectId} initial={note.body} updatedAt={note.updatedAt} />;
  return (
    <Screen header={<TopBar title="Note" />}>
      <QueryBoundary query={q}>{() => null}</QueryBoundary>
    </Screen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ id: 'uuidOrNew', subjectId: 'uuid?' }, NoteEditor);
