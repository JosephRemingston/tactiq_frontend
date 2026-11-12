import { useState } from 'react';
import { View } from 'react-native';

import { useCollectionMutations, useCollections } from '@/api/hooks';
import type { CollectionItemType } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Divider, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

/** New collection form: name up to 80, description up to 500. */
export function CollectionForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: { name: string; description: string | null };
  submitLabel: string;
  onSubmit: (v: { name: string; description: string }) => void;
  busy?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const tooLong = name.trim().length > 80;
  return (
    <Stack gap={14}>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} counter placeholder="World Cup finals" autoFocus error={tooLong ? 'Up to 80 characters' : null} />
      <TextField label="Description (optional)" value={desc} onChangeText={setDesc} maxLength={500} counter multiline style={{ minHeight: 80 }} placeholder="What ties these together?" />
      <Button label={submitLabel} variant="ink" onPress={() => onSubmit({ name: name.trim(), description: desc.trim() })} disabled={!name.trim() || tooLong} loading={busy} />
    </Stack>
  );
}

/** Add to collection: lists collections plus New collection. */
export function AddToCollectionSheet({ itemType, itemId }: { itemType: CollectionItemType; itemId: string }) {
  const { c } = useTheme();
  const { closeSheet, snack } = useOverlay();
  const cols = useCollections();
  const m = useCollectionMutations();
  const [creating, setCreating] = useState(false);

  const add = (id: string, name: string) =>
    m.add.mutate(
      { id, itemType, itemId },
      {
        onSuccess: () => {
          closeSheet();
          snack(`Added to ${name}`);
        },
        onError: () => snack("Couldn't add it. Try again."),
      },
    );

  if (creating)
    return (
      <CollectionForm
        submitLabel="Create and add"
        busy={m.create.isPending || m.add.isPending}
        onSubmit={(v) =>
          m.create.mutate(
            { name: v.name, ...(v.description ? { description: v.description } : {}) },
            { onSuccess: (r) => add(r.collection.id, r.collection.name), onError: () => snack("Couldn't create the collection.") },
          )
        }
      />
    );

  return (
    <Stack gap={4}>
      <Lift kind="none" onPress={() => setCreating(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="add" color={c.onLime} />
        </View>
        <T v="titleSm">New collection</T>
      </Lift>
      <Divider />
      {cols.isLoading ? (
        <Skeleton h={48} />
      ) : (
        cols.data?.collections.map((col) => (
          <Lift
            key={col.id}
            kind="none"
            onPress={() => add(col.id, col.name)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 }}
            accessibilityLabel={`Add to ${col.name}, ${col.items} items`}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="folder" color={c.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="titleSm" numberOfLines={1}>
                {col.name}
              </T>
              <T v="caption" color="muted">
                {col.items} {col.items === 1 ? 'item' : 'items'}
              </T>
            </View>
          </Lift>
        ))
      )}
    </Stack>
  );
}
