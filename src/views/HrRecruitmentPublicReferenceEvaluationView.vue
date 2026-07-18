<template>
  <div
    class="public-portal-container min-h-screen bg-slate-900 flex items-center justify-center p-4"
  >
    <div
      class="portal-card"
      :class="{ 'portal-card--compact': loading || error || submitted }"
    >
      <div class="portal-header text-center mb-8">
        <img
          src="/hompimplay_icon.png"
          alt="Hompimplay"
          class="brand-logo-public"
        />
        <div
          class="logo-placeholder inline-block bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-md shadow-primary/20"
        >
          HRIS Portal
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">
          Formulir Reference Check
        </h1>
        <p v-if="data" class="subtitle text-slate-400 mt-2 text-sm">
          Kandidat: <span class="highlight">{{ data.candidate_name }}</span> —
          Posisi <span class="highlight">{{ data.vacancy_title }}</span>
        </p>
      </div>

      <div v-if="loading" class="loading-state text-center py-12">
        <div
          class="spinner border-4 border-primary/20 border-t-primary rounded-full w-10 h-10 mx-auto animate-spin mb-4"
        ></div>
        <p class="text-slate-400 text-sm">Memuat formulir reference check...</p>
      </div>
      <div v-else-if="error" class="error-state text-center py-12">
        <div class="status-icon status-icon--error">
          <span class="i-lucide-circle-alert"></span>
        </div>
        <h2>Reference Check Tidak Tersedia</h2>
        <p>{{ error }}</p>
        <p class="state-note">
          Reference Check telah selesai atau link sudah tidak berlaku.
        </p>
      </div>
      <div v-else-if="submitted" class="success-state text-center py-12">
        <div class="status-icon status-icon--success">
          <span class="i-lucide-check"></span>
        </div>
        <h2>Jawaban Berhasil Diterima</h2>
        <p>Terima kasih atas waktu dan informasi yang telah Anda berikan.</p>
        <p class="state-note">
          Tautan ini telah selesai digunakan. Anda dapat menutup halaman
          sekarang.
        </p>
      </div>

      <form v-else class="portal-form space-y-6" @submit.prevent="handleSubmit">
        <div class="instructions">
          <span class="i-lucide-info info-box-icon"></span>
          <p>
            <strong>Petunjuk:</strong> Mohon isi seluruh pertanyaan berdasarkan
            pengalaman profesional Anda bersama kandidat. Jawaban akan dijaga
            kerahasiaannya oleh tim recruitment.
          </p>
        </div>

        <FormSection title="A. Data Umum">
          <div class="reference-form-grid">
            <Field label="Nama Pemberi Referensi"
              ><input v-model.trim="form.reference_name" required
            /></Field>
            <Field label="Posisi Pemberi Referensi"
              ><input v-model.trim="form.reference_position" required
            /></Field>
            <Field label="Hubungan Kerja"
              ><select v-model="form.work_relationship" required>
                <option value="" disabled>Pilih hubungan</option>
                <option value="Peer">Rekan Kerja</option>
                <option value="Direct Report">Atasan Langsung</option>
                <option value="Subordinate">Bawahan</option>
              </select></Field
            >
            <Field label="Lama Bekerja Bersama Kandidat"
              ><input
                v-model.trim="form.worked_together_duration"
                placeholder="Contoh: 2 tahun 6 bulan"
                required
            /></Field>
            <Field label="Nama Perusahaan Terakhir Bekerja Bersama"
              ><input v-model.trim="form.company_together" required
            /></Field>
            <Field label="Posisi Terakhir Kandidat"
              ><input v-model.trim="form.candidate_last_position" required
            /></Field>
            <Field label="Alasan Kandidat Keluar" full>
              <textarea
                v-model.trim="form.candidate_exit_reason"
                rows="3"
                required
              ></textarea>
            </Field>
            <Field label="Kepergian Kandidat" full
              ><select v-model="form.exit_initiator" required>
                <option value="" disabled>Pilih jawaban</option>
                <option value="candidate">Atas inisiatif kandidat</option>
                <option value="company">Keputusan perusahaan</option>
              </select></Field
            >
          </div>
        </FormSection>

        <FormSection title="B. Performa Kerja & Kompetensi">
          <Narrative
            v-model="form.achievements"
            label="Apa saja pencapaian kandidat selama bekerja?"
          />
          <Narrative
            v-model="form.top_strengths"
            label="Sebutkan 3 kelebihan utama kandidat."
          />
          <Narrative
            v-model="form.teamwork"
            label="Bagaimana kemampuan kandidat dalam kerja sama tim?"
          />
          <Narrative
            v-model="form.learning_adaptability"
            label="Seberapa cepat kandidat mempelajari hal baru atau beradaptasi?"
          />
          <Narrative
            v-model="form.conflict_handling"
            label="Bagaimana kandidat menangani konflik?"
          />
          <Narrative
            v-model="form.improvement_areas"
            label="Sebutkan tiga hal yang masih perlu ditingkatkan."
          />
        </FormSection>

        <FormSection title="C. Sikap & Etos Kerja">
          <Narrative
            v-model="form.reliability"
            label="Seberapa dapat diandalkan kandidat menyelesaikan tugas tepat waktu?"
          />
          <Narrative
            v-model="form.pressure_handling"
            label="Bagaimana kandidat menghadapi tekanan atau deadline?"
          />
          <Narrative
            v-model="form.commitment_attendance"
            label="Bagaimana komitmen, kehadiran, dan ketepatan waktu kandidat?"
          />
        </FormSection>

        <FormSection title="D. Penilaian Akhir">
          <Narrative
            v-model="form.work_again"
            label="Apakah Anda bersedia bekerja sama lagi dengan kandidat? Mengapa?"
          />
          <Field label="Apakah Anda merekomendasikan kandidat?" full
            ><select v-model="form.recommendation" required>
              <option value="" disabled>Pilih jawaban</option>
              <option value="yes">Ya, saya rekomendasikan</option>
              <option value="no">Tidak saya rekomendasikan</option>
            </select></Field
          >
          <Narrative
            v-model="form.additional_notes"
            label="Adakah hal lain yang perlu kami ketahui?"
          />
          <div class="assessment-card">
            <div class="assessment-title mb-3">
              Rating Akhir <span class="text-red-400">*</span>
            </div>
            <div class="grid grid-cols-5 gap-2">
              <label
                v-for="score in 5"
                :key="score"
                class="score-option"
                :class="{ 'is-selected': form.rating === score }"
                ><input
                  v-model="form.rating"
                  class="hidden"
                  type="radio"
                  :value="score"
                /><span class="text-base font-extrabold">{{ score }}</span
                ><span
                  class="text-[8px] uppercase tracking-wide mt-0.5 font-bold"
                  >{{ ratingLabels[score] }}</span
                ></label
              >
            </div>
          </div>
        </FormSection>

        <FormSection
          v-if="type === 'managerial'"
          title="E. Teamwork & Leadership"
        >
          <Narrative
            v-model="form.leadership"
            label="Apakah kandidat menunjukkan kemampuan kepemimpinan? Berikan contoh."
          />
          <Narrative
            v-model="form.leadership_conflict"
            label="Bagaimana kandidat menyelesaikan konflik atau perbedaan pendapat?"
          />
          <Narrative
            v-model="form.team_relationship"
            label="Bagaimana hubungan kandidat dengan anggota tim dan rekan kerja?"
          />
        </FormSection>

        <div v-if="validationError" class="validation-warning">
          {{ validationError }}
        </div>
        <button
          class="submit-btn"
          type="submit"
          :disabled="submitting || !complete"
        >
          {{ submitting ? "Mengirim jawaban..." : "Kirim Reference Check" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import {
  getPublicReferenceEvaluation,
  getPublicReferenceEvaluationShort,
  submitPublicReferenceEvaluation,
  submitPublicReferenceEvaluationShort,
} from "../services/hrService";

const FormSection = defineComponent({
  props: { title: String },
  setup:
    (props, { slots }) =>
    () =>
      h("section", { class: "reference-question-section" }, [
        h("h2", { class: "reference-section-title" }, props.title),
        h("div", { class: "space-y-4" }, slots.default?.()),
      ]),
});
const Field = defineComponent({
  props: { label: String, full: Boolean },
  setup:
    (props, { slots }) =>
    () =>
      h(
        "label",
        { class: ["reference-field", props.full && "reference-field--full"] },
        [h("span", [props.label, h("b", " *")]), ...(slots.default?.() || [])],
      ),
});
const Narrative = defineComponent({
  props: { label: String, modelValue: String },
  emits: ["update:modelValue"],
  setup:
    (props, { emit }) =>
    () =>
      h("label", { class: "reference-field reference-field--full" }, [
        h("span", [props.label, h("b", " *")]),
        h("textarea", {
          rows: 4,
          required: true,
          value: props.modelValue,
          onInput: (event) => emit("update:modelValue", event.target.value),
        }),
      ]),
});
const route = useRoute();
const type = ref(route.params.type || "");
const token = route.params.token;
const code = route.params.code;
const loading = ref(true);
const submitting = ref(false);
const submitted = ref(false);
const error = ref("");
const validationError = ref("");
const data = ref(null);
const form = reactive({
  reference_name: "",
  reference_position: "",
  work_relationship: "",
  worked_together_duration: "",
  company_together: "",
  candidate_last_position: "",
  candidate_exit_reason: "",
  exit_initiator: "",
  achievements: "",
  top_strengths: "",
  teamwork: "",
  learning_adaptability: "",
  conflict_handling: "",
  improvement_areas: "",
  reliability: "",
  pressure_handling: "",
  commitment_attendance: "",
  work_again: "",
  recommendation: "",
  additional_notes: "",
  rating: null,
  leadership: "",
  leadership_conflict: "",
  team_relationship: "",
});
const ratingLabels = {
  1: "Sangat Tidak",
  2: "Tidak",
  3: "Netral",
  4: "Rekomendasi",
  5: "Sangat",
};
const complete = computed(() =>
  Object.entries(form)
    .filter(
      ([key]) =>
        type.value === "managerial" ||
        !["leadership", "leadership_conflict", "team_relationship"].includes(
          key,
        ),
    )
    .every(([, value]) => value !== null && String(value).trim() !== ""),
);
onMounted(async () => {
  try {
    const response = code
      ? await getPublicReferenceEvaluationShort(code)
      : await getPublicReferenceEvaluation(type.value, token);
    data.value = response.data.data;
    type.value = data.value.type;
    Object.assign(form, {
      reference_name: data.value.reference.name,
      reference_position: data.value.reference.position,
      work_relationship: ["Peer", "Direct Report", "Subordinate"].includes(
        data.value.reference.relationship,
      )
        ? data.value.reference.relationship
        : "",
      company_together: data.value.reference.company,
    });
  } catch {
    error.value =
      "Reference Check telah selesai atau link sudah tidak berlaku.";
  } finally {
    loading.value = false;
  }
});
async function handleSubmit() {
  if (!complete.value) {
    validationError.value = "Semua field dan rating wajib diisi.";
    return;
  }
  submitting.value = true;
  validationError.value = "";
  try {
    if (code) await submitPublicReferenceEvaluationShort(code, form);
    else await submitPublicReferenceEvaluation(type.value, token, form);
    submitted.value = true;
  } catch (err) {
    if ([404, 410].includes(err.response?.status))
      error.value =
        "Reference Check telah selesai atau link sudah tidak berlaku.";
    else
      validationError.value =
        err.response?.data?.message ||
        "Jawaban gagal dikirim. Silakan coba kembali.";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.public-portal-container {
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
}
.portal-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.reference-question-section {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
}
.reference-section-title {
  margin: 0 0 18px;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.reference-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.reference-field {
  display: block;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}
.reference-field--full {
  grid-column: 1/-1;
}
.reference-field b {
  color: #fb7185;
}
.reference-field input,
.reference-field select,
.reference-field textarea {
  display: block;
  width: 100%;
  margin-top: 7px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  padding: 11px 12px;
  color: #f8fafc;
  outline: none;
}
.reference-field textarea {
  resize: vertical;
  line-height: 1.55;
}
.reference-field input:focus,
.reference-field select:focus,
.reference-field textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
@media (max-width: 640px) {
  .reference-form-grid {
    grid-template-columns: 1fr;
  }
  .reference-field--full {
    grid-column: auto;
  }
  .reference-question-section {
    padding: 15px;
  }
  .score-option {
    padding-inline: 3px;
  }
}
</style>
