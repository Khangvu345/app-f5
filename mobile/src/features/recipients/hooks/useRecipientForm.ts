import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { newOperationId } from '@/services/storage/local-db';
import { useAuthStore } from '@/store/auth.store';

import {
  createRecipient,
  deleteRecipient,
  getDeleteImpact,
  getRecipientDetail,
  RecipientInUseError,
  updateRecipient,
} from '../api/recipients.api';
import type { DeleteImpact, RecipientFormValues } from '../types/recipients.types';
import { hasErrors, validateForm, type FormErrors } from '../utils/recipientForm';

type FormStatus = 'loading' | 'ready' | 'notFound' | 'error';

export const EMPTY_FORM: RecipientFormValues = {
  name: '',
  relationship: 'FAMILY',
  ageGroup: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  likes: [],
  avoids: [],
  notes: '',
};

const TABS_RECIPIENTS = '/(app)/(tabs)/recipients';

interface RecipientFormState {
  status: FormStatus;
  values: RecipientFormValues;
  errors: FormErrors;
  isSaving: boolean;
  saveError: string | null;
  isLimitReached: boolean;
  /** Tác động khi xóa: có giá trị nghĩa là đang mở hộp thoại xác nhận. */
  deleteImpact: DeleteImpact | null;
  isDeleting: boolean;
  isEditing: boolean;
  setValue: <K extends keyof RecipientFormValues>(key: K, value: RecipientFormValues[K]) => void;
  submit: () => void;
  requestDelete: () => void;
  confirmDelete: () => void;
  cancelDelete: () => void;
  dismissLimit: () => void;
}

export function useRecipientForm(recipientId?: string): RecipientFormState {
  const profile = useAuthStore((state) => state.profile);
  const isEditing = recipientId !== undefined;
  const [status, setStatus] = useState<FormStatus>(isEditing ? 'loading' : 'ready');
  const [values, setValues] = useState<RecipientFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Một mã thao tác cho mỗi lần mở form để bấm Lưu nhiều lần không tạo trùng.
  const operationId = useRef(newOperationId('recipient'));

  useEffect(() => {
    if (!profile || recipientId === undefined) return;
    let isCurrent = true;
    void (async () => {
      try {
        const detail = await getRecipientDetail(profile, recipientId);
        if (!isCurrent) return;
        if (!detail) {
          setStatus('notFound');
          return;
        }
        setValues({
          name: detail.name,
          relationship: detail.relationship,
          ageGroup: detail.ageGroup,
          birthDay: detail.birthDay === null ? '' : String(detail.birthDay),
          birthMonth: detail.birthMonth === null ? '' : String(detail.birthMonth),
          birthYear: detail.birthYear === null ? '' : String(detail.birthYear),
          likes: detail.likes,
          avoids: detail.avoids,
          notes: detail.notes ?? '',
        });
        setStatus('ready');
      } catch {
        if (isCurrent) setStatus('error');
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [profile, recipientId]);

  const setValue = useCallback(
    <K extends keyof RecipientFormValues>(key: K, value: RecipientFormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
      setErrors({});
      setSaveError(null);
    },
    [],
  );

  const submit = useCallback(() => {
    if (!profile || isSaving) return;
    const found = validateForm(values);
    setErrors(found);
    if (hasErrors(found)) return;
    setIsSaving(true);
    setSaveError(null);
    void (async () => {
      try {
        if (recipientId === undefined) {
          const outcome = await createRecipient(profile, values, operationId.current);
          if (outcome === 'limit-reached') {
            setIsLimitReached(true);
            return;
          }
        } else {
          await updateRecipient(profile, recipientId, values);
        }
        router.back();
      } catch {
        setSaveError('Không lưu được hồ sơ. Vui lòng thử lại.');
      } finally {
        setIsSaving(false);
      }
    })();
  }, [profile, isSaving, values, recipientId]);

  const requestDelete = useCallback(() => {
    if (!profile || recipientId === undefined) return;
    void (async () => {
      try {
        setDeleteImpact(await getDeleteImpact(profile, recipientId));
      } catch {
        setSaveError('Không kiểm tra được dữ liệu liên quan. Vui lòng thử lại.');
      }
    })();
  }, [profile, recipientId]);

  const confirmDelete = useCallback(() => {
    if (!profile || recipientId === undefined || isDeleting) return;
    setIsDeleting(true);
    void (async () => {
      try {
        await deleteRecipient(profile, recipientId);
        setDeleteImpact(null);
        router.dismissAll();
        router.replace(TABS_RECIPIENTS);
      } catch (error) {
        if (error instanceof RecipientInUseError) setDeleteImpact(error.impact);
        else {
          setDeleteImpact(null);
          setSaveError('Không xóa được hồ sơ. Vui lòng thử lại.');
        }
      } finally {
        setIsDeleting(false);
      }
    })();
  }, [profile, recipientId, isDeleting]);

  return {
    status,
    values,
    errors,
    isSaving,
    saveError,
    isLimitReached,
    deleteImpact,
    isDeleting,
    isEditing,
    setValue,
    submit,
    requestDelete,
    confirmDelete,
    cancelDelete: () => setDeleteImpact(null),
    dismissLimit: () => setIsLimitReached(false),
  };
}
