import React, { useState } from 'react';
import { View, Text, Image, TextInput, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';

import { colors, radius } from '../theme';
import { computeImpact, IMPACT } from '../lib/impact';
import { PREP_TIPS } from '../lib/content';
import { classifyImage, createPost } from '../lib/api';
import { useProfile } from '../lib/ProfileContext';
import { updateStreak, applyStreakBonus } from '../lib/profileStore';
import { showToast } from '../lib/toast';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Tag from '../components/Tag';
import RecycleBadge from '../components/RecycleBadge';

const ANALYZING_MESSAGES = ['READING MATERIAL...', 'ESTIMATING WEIGHT...', 'CALCULATING IMPACT...'];

export default function ScanScreen() {
  const navigation = useNavigation();
  const { profile, saveProfile } = useProfile();
  const [stage, setStage] = useState('idle'); // idle | analyzing | review | naming
  const [analyzingMsg, setAnalyzingMsg] = useState(ANALYZING_MESSAGES[0]);
  const [pending, setPending] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [checkedTips, setCheckedTips] = useState([]);

  async function startScan() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast('Camera permission is needed to scan an item');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    handleCapture(result.assets[0].uri);
  }

  async function handleCapture(uri) {
    setStage('analyzing');
    let msgIdx = 0;
    setAnalyzingMsg(ANALYZING_MESSAGES[0]);
    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % ANALYZING_MESSAGES.length;
      setAnalyzingMsg(ANALYZING_MESSAGES[msgIdx]);
    }, 1100);

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 720 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const result = await classifyImage(manipulated.base64, 'image/jpeg');
      const { weightG, co2G, points, imp, category } = computeImpact(result.category, result.size_bucket);

      setPending({
        category,
        itemName: result.item_name || imp.label,
        weightG,
        co2G,
        points,
        funFact: result.fun_fact || '',
        imageUri: manipulated.uri,
      });
      setCheckedTips((PREP_TIPS[category] || []).map(() => false));
      clearInterval(msgTimer);
      setStage('review');
    } catch (err) {
      console.error(err);
      clearInterval(msgTimer);
      setStage('idle');
      showToast("Couldn't read that scan — try again");
    }
  }

  function retake() {
    setPending(null);
    setCheckedTips([]);
    setStage('idle');
  }

  function toggleTip(idx) {
    setCheckedTips((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  }

  function onPressPost() {
    if (!profile.username) {
      setStage('naming');
      return;
    }
    finalizePost();
  }

  async function confirmName() {
    const val = nameInput.trim();
    if (!val) return;
    await saveProfile({ ...profile, username: val });
    finalizePost(val);
  }

  async function finalizePost(usernameOverride) {
    if (!pending) return;
    setPosting(true);
    try {
      const username = usernameOverride || profile.username;
      const streaked = updateStreak(profile);
      const finalPoints = applyStreakBonus(streaked, pending.points);
      const nextProfile = {
        ...streaked,
        username,
        totalPoints: streaked.totalPoints + finalPoints,
        totalScans: streaked.totalScans + 1,
        byCategory: {
          ...streaked.byCategory,
          [pending.category]: (streaked.byCategory[pending.category] || 0) + 1,
        },
      };
      await saveProfile(nextProfile);

      await createPost({
        username,
        category: pending.category,
        itemName: pending.itemName,
        weightG: pending.weightG,
        co2G: pending.co2G,
        points: finalPoints,
        funFact: pending.funFact,
        imageUri: pending.imageUri,
        mediaType: 'image/jpeg',
      });

      setPending(null);
      setCheckedTips([]);
      setStage('idle');
      showToast('Posted to the feed!');
      navigation.navigate('Feed');
    } catch (err) {
      console.error(err);
      showToast("Couldn't post — try again");
    }
    setPosting(false);
  }

  return (
    <View style={styles.screen}>
      <AppHeader />
      <View style={styles.content}>
        <Text style={styles.title}>New post</Text>

        {stage === 'idle' && (
          <View style={styles.hero}>
            <Pressable style={styles.scanBtn} onPress={startScan}>
              <Text style={styles.scanBtnLabel}>Scan</Text>
            </Pressable>
            <Text style={styles.sub}>
              Photograph what you're recycling. We'll identify it, estimate your impact, and get it ready to share
              with the feed.
            </Text>
          </View>
        )}

        {stage === 'analyzing' && (
          <View style={styles.analyzing}>
            <ActivityIndicator size="small" color={colors.forest} />
            <Text style={styles.analyzingMsg}>{analyzingMsg}</Text>
          </View>
        )}

        {(stage === 'review' || stage === 'naming') && pending && (
          <View>
            <View style={styles.previewCard}>
              <Image source={{ uri: pending.imageUri }} style={styles.previewImage} />
              <View style={styles.previewBody}>
                <View style={styles.tagRow}>
                  <Tag
                    tag={IMPACT[pending.category].tag}
                    label={`${IMPACT[pending.category].icon} ${IMPACT[pending.category].label}`}
                  />
                  <RecycleBadge
                    recyclable={IMPACT[pending.category].recyclable}
                    label={IMPACT[pending.category].recycleLabel}
                  />
                </View>
                <Text style={styles.itemName}>{pending.itemName}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{pending.weightG}g</Text>
                    <Text style={styles.statLbl}>Est. weight</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{pending.co2G}g</Text>
                    <Text style={styles.statLbl}>CO2 saved</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: colors.terracotta }]}>+{pending.points}</Text>
                    <Text style={styles.statLbl}>Points</Text>
                  </View>
                </View>
                {pending.funFact ? (
                  <View style={styles.fact}>
                    <Text style={styles.factText}>
                      <Text style={{ fontWeight: '700', color: colors.ink }}>Did you know: </Text>
                      {pending.funFact}
                    </Text>
                  </View>
                ) : null}

                {(PREP_TIPS[pending.category] || []).length > 0 && (
                  <>
                    <Text style={styles.prepLabel}>Before you toss it in</Text>
                    <View>
                      {(PREP_TIPS[pending.category] || []).map((tip, i) => (
                        <Pressable key={i} style={styles.prepItem} onPress={() => toggleTip(i)}>
                          <View style={[styles.prepCheck, checkedTips[i] && styles.prepCheckChecked]}>
                            {checkedTips[i] ? <Text style={styles.prepCheckMark}>✓</Text> : null}
                          </View>
                          <Text style={[styles.prepText, checkedTips[i] && styles.prepTextDone]}>{tip}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>

            {stage === 'review' ? (
              <View style={styles.actions}>
                <Button title="Retake" onPress={retake} style={{ flex: 1 }} />
                <Button
                  title="Post to feed"
                  variant="primary"
                  onPress={onPressPost}
                  style={{ flex: 1 }}
                  disabled={posting || checkedTips.some((c) => !c)}
                />
              </View>
            ) : (
              <View style={styles.nameCard}>
                <Text style={styles.cardText}>Add your name to post to the community feed.</Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  maxLength={24}
                  style={styles.input}
                  placeholderTextColor={colors.inkDim}
                />
                <Button
                  title="Continue"
                  variant="primary"
                  onPress={confirmName}
                  style={{ width: '100%' }}
                  disabled={posting}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: 18 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkDim,
    marginBottom: 18,
  },
  hero: { alignItems: 'center', paddingTop: 30 },
  scanBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    borderColor: colors.sage,
  },
  scanBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  sub: { color: colors.inkDim, fontSize: 13, marginTop: 22, maxWidth: 260, lineHeight: 19, textAlign: 'center' },
  analyzing: { alignItems: 'center', paddingVertical: 60, gap: 18 },
  analyzingMsg: { fontSize: 12, fontWeight: '600', color: colors.inkDim, letterSpacing: 0.5 },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceAlt },
  previewBody: { padding: 18 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName: { fontWeight: '700', fontSize: 20, color: colors.ink, marginTop: 10, marginBottom: 14 },
  prepLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.inkDim,
    marginTop: 16,
    marginBottom: 6,
  },
  prepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  prepCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  prepCheckChecked: { backgroundColor: colors.forest, borderColor: colors.forest },
  prepCheckMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  prepText: { flex: 1, fontSize: 13, color: colors.ink },
  prepTextDone: { color: colors.inkDim, textDecorationLine: 'line-through' },
  statsRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 19, color: colors.ink },
  statLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.inkDim, marginTop: 2 },
  fact: { backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: radius.sm },
  factText: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  nameCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    marginTop: 18,
    alignItems: 'center',
  },
  cardText: { fontSize: 13, color: colors.inkDim, marginBottom: 14, lineHeight: 19, textAlign: 'center' },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 12,
  },
});
