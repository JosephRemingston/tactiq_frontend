import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useCollection, useCollectionMutations, useNote } from '@/api/hooks';
import type { Collection, CollectionItem } from '@/api/types';
import { CollectionForm } from '@/components/CollectionSheet';
import { QueryBoundary } from '@/components/QueryBoundary';
import { ReorderList } from '@/components/ReorderList';
import { IconTile, ListRow } from '@/components/rows';
import { EmptyState } from '@/components/states';
import { SubjectHeader } from '@/components/SubjectHeader';
import { fmtRelative } from '@/lib/format';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const TYPE_LABEL = { match: 'Match', insight: 'Insight', player: 'Player', team: 'Team', note: 'Note' } as const;
const TYPE_ICON = { match: 'sports_soccer', insight: 'lightbulb', player: 'person', team: 'groups', note: 'edit_note' } as const;

function NoteItem({ id }: { id: string }) {
  const q = useNote(id);
  return (
    <Card onPress={() => router.push({ pathname: '/note/[id]', params: { id } })}>
      <Tag size="sm" icon="edit_note">
        Note
      </Tag>
      <T v="body" style={{ marginTop: 8 }} numberOfLines={3}>
        {q.data?.note.body ?? '…'}
      </T>
    </Card>
  );
}

function Item({ it, onRemove }: { it: CollectionItem; onRemove: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <T v="caption" color="muted" style={{ flex: 1 }}>
          {TYPE_LABEL[it.itemType]} · added {fmtRelative(it.addedAt)}
        </T>
        <IconButton icon="remove_circle_outline" label={`Remove ${TYPE_LABEL[it.itemType].toLowerCase()} from collection`} size={20} onPress={onRemove} />
      </Row>
      {it.itemType === 'note' ? <NoteItem id={it.itemId} /> : <SubjectHeader type={it.itemType} id={it.itemId} />}
    </View>
  );
}

function Body({ col }: { col: Collection }) {
  const m = useCollectionMutations();
  const { openSheet, closeSheet, confirm, snack } = useOverlay();
  const [reorder, setReorder] = useState(false);
  const items = [...col.items].sort((a, b) => a.position - b.position);
  const edit = () =>
    openSheet(
      <CollectionForm
        initial={{ name: col.name, description: col.description }}
        submitLabel="Save changes"
        onSubmit={(v) => m.update.mutate({ id: col.id, name: v.name, description: v.description || null }, { onSuccess: closeSheet, onError: () => snack("Couldn't save.") })}
      />,
      { title: 'Edit collection' },
    );
  const remove = (it: CollectionItem) =>
    confirm({
      title: `Remove this ${TYPE_LABEL[it.itemType].toLowerCase()}?`,
      body: 'It stays in the app; it just leaves this collection.',
      confirm: 'Remove',
      onConfirm: () => m.removeItem.mutate({ id: col.id, itemType: it.itemType, itemId: it.itemId }, { onSuccess: () => snack('Removed') }),
    });
  return (
    <Stack gap={18}>
      <Rise>
        <T v="display">{col.name}</T>
        {col.description ? (
          <T v="body" color="muted" style={{ marginTop: 6 }}>
            {col.description}
          </T>
        ) : null}
        <T v="caption" color="muted" style={{ marginTop: 8 }}>
          {col.items.length} {col.items.length === 1 ? 'item' : 'items'} · updated {fmtRelative(col.updatedAt)}
        </T>
      </Rise>
      <Row gap={10}>
        <Button label="Edit" icon="edit" variant="secondary" chevron={false} full={false} compact onPress={edit} />
        {items.length > 1 ? <Button label={reorder ? 'Done' : 'Reorder'} icon={reorder ? 'check' : 'swap_vert'} variant={reorder ? 'ink' : 'secondary'} chevron={false} full={false} compact onPress={() => setReorder((r) => !r)} /> : null}
      </Row>
      {!items.length ? (
        <EmptyState icon="folder_open" title="This collection is empty" body="Add matches, insights, players, teams or notes from their menus." />
      ) : reorder ? (
        <ReorderList
          items={items}
          keyOf={(i) => `${i.itemType}:${i.itemId}`}
          render={(i) => <ListRow leading={<IconTile icon={TYPE_ICON[i.itemType]} />} title={TYPE_LABEL[i.itemType]} sub={`Position ${i.position + 1}`} chevron={false} />}
          onReorder={(_, moved, to) => m.add.mutate({ id: col.id, itemType: moved.itemType, itemId: moved.itemId, position: to })}
        />
      ) : (
        <Stack gap={16}>
          {items.map((it) => (
            <Item key={`${it.itemType}:${it.itemId}`} it={it} onRemove={() => remove(it)} />
          ))}
        </Stack>
      )}
      <Button
        label="Delete collection"
        variant="text"
        onPress={() =>
          confirm({
            title: `Delete “${col.name}”?`,
            body: "The items stay in the app. This can't be undone.",
            confirm: 'Delete',
            destructive: true,
            onConfirm: () => m.remove.mutate(col.id, { onSuccess: () => router.back() }),
          })
        }
      />
    </Stack>
  );
}

/** Screen 34, Collection detail: rename, describe, delete; mixed items; drag to reorder; remove. */
export default function CollectionPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useCollection(id);
  return (
    <Screen header={<TopBar title="Collection" />}>
      <QueryBoundary query={q}>{(d) => <Body col={d.collection} />}</QueryBoundary>
    </Screen>
  );
}
