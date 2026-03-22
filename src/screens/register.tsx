import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';

export default function Register() {
  const { register } = useAuth();
  const c = useColors();
  const ss = useMemo(() => makeStyles(c), [c]);
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneClean = phone.replace(/\s/g, '');
  const phoneValid = phoneClean.length === 10 && /^\d+$/.test(phoneClean);
  const nameValid = name.trim().length > 0 && name.trim().length <= 50;
  const canNext = phoneValid && nameValid;
  const canFinish = pin.length === 4 && pin2.length === 4 && !loading;

  const handleName = (t: string) => setName(t.slice(0, 50));

  const finish = async () => {
    if (pin !== pin2) { Alert.alert('', L.pinMismatch); return; }
    setLoading(true);
    try {
      await register(phoneClean, name.trim(), pin);
    } catch {
      Alert.alert('Khalad', 'Wax khalad ah ayaa dhacay. Fadlan isku day mar kale.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={ss.root}>
      <View style={ss.top}>
        <View style={ss.logoWrap}>
          <Feather name="shopping-bag" size={36} color={c.blue} />
        </View>
        <Text style={ss.title}>{L.appName}</Text>
        <Text style={ss.sub}>{L.tagline}</Text>
      </View>

      {step === 1 ? (
        <View style={ss.form}>
          <Text style={ss.label}>{L.phoneLabel}</Text>
          <TextInput
            style={ss.input} value={phone} onChangeText={setPhone}
            placeholder={L.phoneHint} placeholderTextColor={c.textTertiary}
            keyboardType="phone-pad" maxLength={13} selectionColor={c.blue}
          />
          <Text style={ss.label}>{L.shopName}</Text>
          <TextInput
            style={ss.input} value={name} onChangeText={handleName}
            placeholder="Dukaan Amina" placeholderTextColor={c.textTertiary}
            selectionColor={c.blue} maxLength={50}
          />
          <Pressable onPress={() => setStep(2)} disabled={!canNext}
            style={[ss.btn, !canNext && ss.btnOff]}>
            <Text style={ss.btnText}>Xiga →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={ss.form}>
          <Text style={ss.label}>{L.setPinLabel}</Text>
          <TextInput
            style={ss.pinInput} value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="● ● ● ●" placeholderTextColor={c.textTertiary}
            keyboardType="number-pad" maxLength={4} secureTextEntry
            selectionColor={c.blue} autoFocus
          />
          <Text style={ss.label}>{L.confirmPin}</Text>
          <TextInput
            style={ss.pinInput} value={pin2}
            onChangeText={(t) => setPin2(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="● ● ● ●" placeholderTextColor={c.textTertiary}
            keyboardType="number-pad" maxLength={4} secureTextEntry
            selectionColor={c.blue}
          />
          <View style={ss.row}>
            <Pressable onPress={() => setStep(1)} style={ss.back}>
              <Text style={ss.backText}>← Dib u noqo</Text>
            </Pressable>
            <Pressable onPress={finish} disabled={!canFinish}
              style={[ss.btn, { flex: 1 }, !canFinish && ss.btnOff]}>
              <Text style={ss.btnText}>{loading ? '...' : L.register}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, justifyContent: 'space-between', padding: S.lg },
    top: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: S.sm },
    logoWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    sub: { fontSize: 15, color: c.textSecondary },
    form: { paddingBottom: S.xl },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: S.xs, marginTop: S.md, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 56, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: S.md, fontSize: 18, fontWeight: '500', color: c.text, borderWidth: 1, borderColor: c.border },
    pinInput: { height: 64, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: S.lg, fontSize: 28, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: 12, borderWidth: 1, borderColor: c.border },
    btn: { height: 52, backgroundColor: c.blue, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginTop: S.lg },
    btnOff: { opacity: 0.35 },
    btnText: { color: c.white, fontSize: 16, fontWeight: '700' },
    row: { flexDirection: 'row', gap: S.sm, marginTop: S.lg },
    back: { height: 52, justifyContent: 'center', paddingHorizontal: S.md },
    backText: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
  });
}
