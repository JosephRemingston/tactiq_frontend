import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { queryKey, useSessions, useUserScope } from '@/api/hooks';
import { QueryBoundary } from '@/components/QueryBoundary';
import { IconTile, ListRow } from '@/components/rows';
import { fmtDate, fmtRelative } from '@/lib/format';
import { useAuth } from '@/services/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Stack } from '@/ui/bits';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

/** Screen 36a, Devices: signed-in sessions, current device marked, sign out per device. */
export default function Devices() {
  const q = useSessions();
  const qc = useQueryClient();
  const scope = useUserScope();
  const userKey = useAuth((s) => s.userKey);
  const { confirm, snack } = useOverlay();
  const current = `sess_user_dev_${userKey}`;
  return (
    <Screen header={<TopBar title="Devices" sub="Where you're signed in" />}>
      <QueryBoundary query={q}>
        {({ sessions }) => (
          <Stack gap={14}>
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {sessions.map((s, i) => {
                const isCurrent = s.id === current;
                return (
                  <View key={s.id}>
                    {i > 0 ? <Divider inset={54} /> : null}
                    <ListRow
                      leading={<IconTile icon={isCurrent ? 'smartphone' : 'devices_other'} tone={isCurrent ? 'lime' : 'neutral'} />}
                      title={isCurrent ? 'This device' : `Session ${s.id.slice(-6)}`}
                      sub={`${s.status} · last active ${fmtRelative(s.lastActiveAt)} · expires ${fmtDate(s.expireAt)}`}
                      chevron={false}
                      trailing={
                        isCurrent ? (
                          <Tag size="sm" tone="lime">
                            Current
                          </Tag>
                        ) : (
                          <Button
                            label="Sign out"
                            variant="secondary"
                            compact
                            full={false}
                            onPress={() =>
                              confirm({
                                title: 'Sign out this device?',
                                confirm: 'Sign out',
                                onConfirm: async () => {
                                  try {
                                    await api.revokeSession(s.id);
                                    snack('Signed out');
                                    qc.invalidateQueries({ queryKey: queryKey(scope, 'sessions') });
                                  } catch (e) {
                                    snack(e instanceof ApiError && e.status === 404 ? 'That session has already ended.' : "Couldn't sign it out.");
                                  }
                                },
                              })
                            }
                          />
                        )
                      }
                    />
                  </View>
                );
              })}
            </Card>
            <T v="caption" color="muted">
              Signing out a device ends that session. To sign out here, use Profile.
            </T>
          </Stack>
        )}
      </QueryBoundary>
      {q.error instanceof ApiError && q.error.code === 'PROVIDER_UNAVAILABLE' ? (
        <View style={{ marginTop: 12 }}>
          <T v="caption" color="muted">
            Session management needs the sign-in service, which isn't connected in this build.
          </T>
        </View>
      ) : null}
    </Screen>
  );
}
