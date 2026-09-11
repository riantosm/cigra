import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import SecureImage from '@/components/atoms/SecureImage';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import DateTimeField from '@/components/molecules/DateTimeField';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import type { SegmentedOption } from '@/components/molecules/SegmentedControl';
import StatusModal from '@/components/organisms/StatusModal';
import type { StatusModalVariant } from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { updateProfileApi } from '@/services/api/profile.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { profileUpdated } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage } from '@/utils/format';
import { pickProfilePhoto } from '@/utils/filePicker';
import { contentEnterTransition } from '@/utils/motion';

export type EditProfileScreenProps = RootStackScreenProps<
  typeof ROUTES.editProfile
>;

type Gender = 'male' | 'female';
type BloodType = 'A' | 'B' | 'AB' | 'O';

const GENDER_OPTIONS: SegmentedOption<Gender>[] = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
];

const BLOOD_TYPE_OPTIONS: SegmentedOption<BloodType>[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
];

function isGender(value: string | null | undefined): value is Gender {
  return value === 'male' || value === 'female';
}

function isBloodType(value: string | null | undefined): value is BloodType {
  return value === 'A' || value === 'B' || value === 'AB' || value === 'O';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseBirthDate(value: string | null | undefined): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 25);
  return fallback;
}

interface FormStatus {
  variant: StatusModalVariant;
  title: string;
  message: string;
}

interface FormCardProps {
  icon: IconName;
  title: string;
  children: ReactNode;
}

function FormCard(props: FormCardProps) {
  const { icon, title, children } = props;
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name={icon} size={18} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export default function EditProfileScreen(props: EditProfileScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const personnel = user?.personnel;
  const keyboardHeight = useKeyboardHeight();

  const [status, setStatus] = useState<FormStatus | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [fullName, setFullName] = useState(personnel?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(personnel?.phone ?? '');
  const [address, setAddress] = useState(personnel?.address ?? '');
  const [birthPlace, setBirthPlace] = useState(personnel?.birth_place ?? '');
  const [birthDate, setBirthDate] = useState(() =>
    parseBirthDate(personnel?.birth_date),
  );
  const [gender, setGender] = useState<Gender>(
    isGender(personnel?.gender) ? personnel.gender : 'male',
  );
  const [bloodType, setBloodType] = useState<BloodType>(
    isBloodType(personnel?.blood_type) ? personnel.blood_type : 'A',
  );
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function closeStatus() {
    setStatus(null);
  }

  async function handleChangePhoto() {
    if (isUploadingPhoto) return;
    try {
      const file = await pickProfilePhoto();
      if (!file) return;
      setIsUploadingPhoto(true);
      const result = await updateProfileApi({}, file);
      dispatch(profileUpdated(result));
      setPhotoFailed(false);
      setStatus({
        variant: 'success',
        title: 'Foto Diperbarui',
        message: 'Foto profil berhasil diperbarui.',
      });
    } catch (error) {
      setStatus({
        variant: 'error',
        title: 'Gagal Mengubah Foto',
        message: extractErrorMessage(error, 'Foto profil gagal diperbarui.'),
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSavePersonal() {
    if (isSavingPersonal) return;
    if (!fullName.trim()) {
      setPersonalError('Nama lengkap wajib diisi.');
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setPersonalError('Format email tidak valid.');
      return;
    }

    setPersonalError(null);
    setIsSavingPersonal(true);
    try {
      const result = await updateProfileApi({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        birth_place: birthPlace.trim(),
        birth_date: toDateOnlyString(birthDate),
        blood_type: bloodType,
        gender,
      });
      dispatch(profileUpdated(result));
      setStatus({
        variant: 'success',
        title: 'Data Diperbarui',
        message: 'Data pribadi berhasil diperbarui.',
      });
    } catch (error) {
      setPersonalError(
        extractErrorMessage(error, 'Data pribadi gagal diperbarui.'),
      );
    } finally {
      setIsSavingPersonal(false);
    }
  }

  async function handleSavePassword() {
    if (isSavingPassword) return;
    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      setPasswordError('Semua field password wajib diisi.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setPasswordError(null);
    setIsSavingPassword(true);
    try {
      const result = await updateProfileApi({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });
      dispatch(profileUpdated(result));
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setStatus({
        variant: 'success',
        title: 'Password Diperbarui',
        message: 'Password berhasil diubah.',
      });
    } catch (error) {
      setPasswordError(extractErrorMessage(error, 'Gagal mengubah password.'));
    } finally {
      setIsSavingPassword(false);
    }
  }

  const photoPath = personnel?.photo;

  return (
    <MainLayout
      title="Edit Profil"
      subtitle="Foto, data pribadi & password"
      variant="canvas"
      onBack={() => navigation.goBack()}
    >
      <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={contentEnterTransition}
          >
            {personnel ? (
              <FormCard icon="camera" title="Foto Profil">
                <View style={styles.photoRow}>
                  {isDisplayablePhoto(photoPath) && !photoFailed ? (
                    <SecureImage
                      path={photoPath}
                      style={styles.avatarImage}
                      onLoadError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <GradientAvatar
                      label={(personnel.full_name ?? 'U')
                        .charAt(0)
                        .toUpperCase()}
                      gradientStart={colors.gradientPrimaryStart}
                      gradientEnd={colors.gradientPrimaryEnd}
                      size={64}
                    />
                  )}
                  <View style={styles.photoAction}>
                    <Text style={styles.photoHint}>
                      JPEG, PNG, atau WEBP. Maks 2MB.
                    </Text>
                    <GradientButton
                      label="Ganti Foto"
                      icon="camera"
                      height={44}
                      loading={isUploadingPhoto}
                      onPress={handleChangePhoto}
                      style={styles.photoButton}
                    />
                  </View>
                </View>
              </FormCard>
            ) : null}

            {personnel ? (
              <FormCard icon="profile" title="Data Pribadi">
                <View style={styles.form}>
                  <TextField
                    label="Nama Lengkap"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                  <TextField
                    label="Email"
                    leftIcon="mail"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TextField
                    label="No. Telepon / WhatsApp"
                    leftIcon="phone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <TextField
                    label="Alamat"
                    leftIcon="map-pin"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    style={styles.textArea}
                  />
                  <TextField
                    label="Tempat Lahir"
                    leftIcon="cake"
                    value={birthPlace}
                    onChangeText={setBirthPlace}
                  />

                  <DateTimeField
                    label="Tanggal Lahir"
                    mode="date"
                    value={birthDate}
                    onChange={setBirthDate}
                    maximumDate={new Date()}
                  />

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Jenis Kelamin</Text>
                    <SegmentedControl
                      options={GENDER_OPTIONS}
                      value={gender}
                      onChange={setGender}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Golongan Darah</Text>
                    <SegmentedControl
                      options={BLOOD_TYPE_OPTIONS}
                      value={bloodType}
                      onChange={setBloodType}
                    />
                  </View>

                  {personalError ? (
                    <Text style={styles.error}>{personalError}</Text>
                  ) : null}

                  <GradientButton
                    label="Simpan Data Pribadi"
                    height={48}
                    loading={isSavingPersonal}
                    onPress={handleSavePersonal}
                    style={styles.formSubmit}
                  />
                </View>
              </FormCard>
            ) : null}

            <FormCard icon="lock" title="Ganti Password">
              <View style={styles.form}>
                <TextField
                  label="Password Saat Ini"
                  leftIcon="lock"
                  secureTextEntry
                  autoCapitalize="none"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextField
                  label="Password Baru"
                  leftIcon="lock"
                  secureTextEntry
                  autoCapitalize="none"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextField
                  label="Konfirmasi Password Baru"
                  leftIcon="lock"
                  secureTextEntry
                  autoCapitalize="none"
                  value={newPasswordConfirmation}
                  onChangeText={setNewPasswordConfirmation}
                />

                {passwordError ? (
                  <Text style={styles.error}>{passwordError}</Text>
                ) : null}

                <GradientButton
                  label="Ubah Password"
                  height={48}
                  loading={isSavingPassword}
                  onPress={handleSavePassword}
                  style={styles.formSubmit}
                />
              </View>
            </FormCard>
          </MotiView>
        </ScrollView>
      </View>

      <StatusModal
        visible={status !== null}
        variant={status?.variant ?? 'success'}
        title={status?.title ?? ''}
        message={status?.message ?? ''}
        onRequestClose={closeStatus}
        primaryAction={{ label: 'OK', onPress: closeStatus }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
  },
  card: {
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarImage: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: colors.neutralSurface,
  },
  photoAction: {
    flex: 1,
    gap: 10,
  },
  photoHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  photoButton: {
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  formSubmit: {
    marginTop: 4,
  },
  textArea: {
    minHeight: 66,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
