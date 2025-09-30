import * as React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api/notifications';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';

const LIGHT_PURPLE = '#6B4E8C';

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = React.useState([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    const backend = await fetchNotifications();
    // Map backend shape to UI shape expected by this screen
    const mapped = backend
      .slice()
      .sort((a, b) => new Date(b.triggeredOnUtc || 0) - new Date(a.triggeredOnUtc || 0))
      .map(n => ({
        id: n.id,
        // Map simple type to existing icon logic if needed
        type: (n.type && String(n.type).toLowerCase()) || 'info',
        title: n.title || 'Notification',
        body: n.message || '',
        ts: n.triggeredOnUtc || n.changedOnUtc || n.readOnUtc || Date.now(),
        read: !!n.isRead,
        _raw: n,
      }));
    setItems(mapped);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const onPressItem = async (item) => {
    if (!item.read) await markNotificationRead(item.id);
    await load();
    // Optional: route by type later
    // if (item.type === 'session') navigation.navigate('Workouts');
  };

  const onLongPressItem = async (item) => {
    await deleteNotification(item.id);
    await load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const unreadCount = items.filter(i => !i.read).length;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.unreadCard]}
      onPress={() => onPressItem(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Icon
            name={item.type === 'session' ? 'clock' : item.type === 'package' ? 'package' : 'info'}
            size={18}
            color={BRAND_COLORS.YELLOW}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!item.read && <View style={styles.badge} />}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={async () => { await onLongPressItem(item); }}
            accessibilityRole="button"
            accessibilityLabel="Delete notification"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Icon name="trash-2" size={18} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.time}>{new Date(item.ts).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={24} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnRight]}
            onPress={async () => { await markAllNotificationsRead(items.map(i => i._raw)); await load(); }}
          >
            <Icon name="check-circle" size={20} color={BRAND_COLORS.YELLOW} />
            {unreadCount > 0 && <Text style={styles.headerActionText}>Mark all</Text>}
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="bell" size={36} color={BRAND_COLORS.YELLOW} />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: BRAND_COLORS.PURPLE,
  },
  headerBtn: {
    padding: 8,
  },
  headerBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionText: {
    color: BRAND_COLORS.YELLOW,
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  unreadCard: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderWidth: 2,
    borderColor: STATUS_COLORS.SUCCESS,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(207,219,39,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.YELLOW,
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(207,219,39,0.12)',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
  },
});