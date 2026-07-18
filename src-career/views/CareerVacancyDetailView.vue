<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { getVacancy, submitApplication } from "../services/careerApi";
import { companyName, setSeo, siteUrl } from "../utils/seo";

const route = useRoute();
const vacancy = ref(null);
const loading = ref(true);
const notFound = ref(false);
const submitting = ref(false);
const success = ref("");
const formError = ref("");
const errors = ref({});
const showModal = ref(false);
const step = ref(1);
const applicationCard = ref(null);
const showMobileCta = ref(true);
const form = reactive({
  name: "",
  email: "",
  phone: "",
  marital_status: "",
  known_person: "",
  last_company: "",
  education_level: "",
  education_major: "",
  previous_salary: "",
  expected_salary: "",
  referred_from: "",
  resume: null,
  website: "",
});
const labels = {
  full_time: "Penuh Waktu",
  part_time: "Paruh Waktu",
  contract: "Kontrak",
  internship: "Magang",
  temporary: "Sementara",
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

const lines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
const formatSalary = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
};
const updateSalary = (field, value) => {
  form[field] = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
};
const onFile = (event) => {
  form.resume = event.target.files?.[0] || null;
};

function openApplication() {
  success.value = "";
  formError.value = "";
  errors.value = {};
  step.value = 1;
  showModal.value = true;
  document.body.style.overflow = "hidden";
}
function closeApplication() {
  if (submitting.value) return;
  showModal.value = false;
  document.body.style.overflow = "";
}
function validateStep(activeStep) {
  const nextErrors = {};
  if (activeStep === 1) {
    if (form.name.trim().length < 2)
      nextErrors.name = ["Nama lengkap wajib diisi."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nextErrors.email = ["Alamat email tidak valid."];
    if (!/^(?:0?8|628)[0-9]{8,12}$/.test(form.phone.replace(/\D/g, "")))
      nextErrors.phone = ["Nomor WhatsApp Indonesia tidak valid."];
    if (!form.marital_status)
      nextErrors.marital_status = ["Status pernikahan wajib dipilih."];
  } else if (activeStep === 2) {
    if (!form.education_level)
      nextErrors.education_level = ["Pendidikan terakhir wajib dipilih."];
    if (!form.education_major.trim())
      nextErrors.education_major = ["Jurusan pendidikan wajib diisi."];
    if (!form.previous_salary)
      nextErrors.previous_salary = ["Gaji saat ini wajib diisi."];
    if (!form.expected_salary)
      nextErrors.expected_salary = ["Gaji yang diharapkan wajib diisi."];
    if (!form.referred_from)
      nextErrors.referred_from = ["Sumber informasi wajib dipilih."];
    if (!form.resume) nextErrors.resume = ["CV wajib dipilih."];
    else if (form.resume.type !== "application/pdf")
      nextErrors.resume = ["CV harus berupa PDF."];
    else if (form.resume.size > 5 * 1024 * 1024)
      nextErrors.resume = ["Ukuran CV maksimal 5 MB."];
  }
  errors.value = nextErrors;
  formError.value = Object.keys(nextErrors).length
    ? "Mohon lengkapi field yang ditandai sebelum melanjutkan."
    : "";
  return !Object.keys(nextErrors).length;
}
function nextStep() {
  if (!validateStep(step.value)) return;
  step.value++;
  formError.value = "";
  document
    .querySelector(".application-modal-card")
    ?.scrollTo({ top: 0, behavior: "smooth" });
}
function previousStep() {
  step.value = Math.max(1, step.value - 1);
  formError.value = "";
  errors.value = {};
}
function updateMobileCta() {
  if (!applicationCard.value) return;
  showMobileCta.value =
    applicationCard.value.getBoundingClientRect().top > window.innerHeight;
}

function jobPosting(job) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.responsibilities, job.requirements]
      .filter(Boolean)
      .join("\n\n"),
    datePosted: job.published_at,
    validThrough: job.application_deadline
      ? `${job.application_deadline}T23:59:59+07:00`
      : undefined,
    employmentType: job.employment_type?.toUpperCase(),
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      sameAs: siteUrl,
    },
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.location,
            addressCountry: "ID",
          },
        }
      : undefined,
    jobLocationType:
      job.workplace_type === "remote" ? "TELECOMMUTE" : undefined,
  };
}
async function load() {
  try {
    const { data } = await getVacancy(route.params.slug);
    vacancy.value = data.data;
    setSeo({
      title: data.data.title,
      description: `${data.data.title} di ${data.data.location || companyName}. Lihat tanggung jawab, kualifikasi, dan kirim lamaran.`,
      path: `/jobs/${data.data.slug}`,
      jsonLd: jobPosting(data.data),
    });
  } catch (error) {
    notFound.value = error.response?.status === 404;
    setSeo({
      title: "Lowongan Tidak Tersedia",
      description: "Lowongan ini tidak tersedia.",
      path: route.path,
      robots: "noindex,follow",
    });
  } finally {
    loading.value = false;
    await nextTick();
    updateMobileCta();
  }
}
async function apply() {
  if (submitting.value || !validateStep(1) || !validateStep(2)) return;
  submitting.value = true;
  formError.value = "";
  errors.value = {};
  const payload = new FormData();
  Object.entries(form).forEach(
    ([key, value]) => value !== null && payload.append(key, value),
  );
  try {
    const { data } = await submitApplication(vacancy.value.slug, payload);
    success.value = data.message;
  } catch (error) {
    errors.value = error.response?.data?.errors || {};
    formError.value =
      error.response?.status === 429
        ? "Terlalu banyak percobaan. Silakan tunggu sebelum mencoba kembali."
        : error.response?.data?.message ||
          "Lamaran gagal dikirim. Periksa kembali data Anda.";
    step.value = Object.keys(errors.value).some((key) =>
      ["name", "email", "phone", "marital_status"].includes(key),
    )
      ? 1
      : 2;
  } finally {
    submitting.value = false;
  }
}
onMounted(() => {
  load();
  window.addEventListener("scroll", updateMobileCta, { passive: true });
  window.addEventListener("resize", updateMobileCta);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateMobileCta);
  window.removeEventListener("resize", updateMobileCta);
  document.body.style.overflow = "";
});
</script>

<template>
  <div v-if="loading" class="detail-loading section-wrap">
    <div class="skeleton detail-skeleton"></div>
  </div>
  <section v-else-if="notFound || !vacancy" class="state-page section-wrap">
    <span class="eyebrow">LOWONGAN TIDAK TERSEDIA</span>
    <h1>Posisi ini sudah ditutup</h1>
    <p>Silakan lihat kesempatan lain yang masih terbuka.</p>
    <RouterLink to="/jobs" class="button">Lihat lowongan lain</RouterLink>
  </section>
  <template v-else>
    <section class="job-hero">
      <div class="section-wrap">
        <RouterLink to="/jobs" class="back-link">← Semua lowongan</RouterLink
        ><span class="eyebrow">{{
          vacancy.division || "KESEMPATAN BERKARIER"
        }}</span>
        <h1>{{ vacancy.title }}</h1>
        <div class="chips light">
          <span v-if="vacancy.location">⌖ {{ vacancy.location }}</span
          ><span v-if="vacancy.employment_type">{{
            labels[vacancy.employment_type]
          }}</span
          ><span v-if="vacancy.workplace_type">{{
            labels[vacancy.workplace_type]
          }}</span>
        </div>
      </div>
    </section>
    <section class="detail-layout section-wrap">
      <article class="job-content">
        <section>
          <h2>Tentang posisi ini</h2>
          <p class="prose">
            {{
              vacancy.description ||
              "Kami mengundang talenta terbaik untuk bergabung bersama tim kami."
            }}
          </p>
        </section>
        <section v-if="vacancy.responsibilities">
          <h2>Tanggung jawab</h2>
          <ul>
            <li v-for="item in lines(vacancy.responsibilities)" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>
        <section v-if="vacancy.requirements">
          <h2>Kualifikasi</h2>
          <ul>
            <li v-for="item in lines(vacancy.requirements)" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>
        <section v-if="vacancy.benefits">
          <h2>Yang akan kamu dapatkan</h2>
          <ul>
            <li v-for="item in lines(vacancy.benefits)" :key="item">
              {{ item }}
            </li>
          </ul>
        </section>
      </article>
      <aside
        id="apply"
        ref="applicationCard"
        class="application-card application-cta glass-panel"
      >
        <span class="eyebrow">TERTARIK DENGAN POSISI INI?</span>
        <h2>Yuk, mulai langkahmu</h2>
        <p>
          Lengkapi profil, tinjau sekali lagi, lalu kirim — cuma butuh beberapa
          menit.
        </p>
        <div class="application-promise">
          <span>1</span>
          <p>
            <strong>Lengkapi peofil</strong
            ><small>Data diri, pendidikan, dan ekspektasi gaji</small>
          </p>
        </div>
        <div class="application-promise">
          <span>2</span>
          <p>
            <strong>Tinjau lamaran</strong
            ><small>Cek ulang supaya semua informasi akurat</small>
          </p>
        </div>
        <div class="application-promise">
          <span>3</span>
          <p>
            <strong>Kirim lamaran</strong
            ><small>Tim kami akan segera meninjaunya</small>
          </p>
        </div>
        <button
          class="button button-wide"
          type="button"
          @click="openApplication"
        >
          Lamar sekarang <span>→</span>
        </button>
        <p class="privacy-note">CV hanya dapat diakses oleh tim recruitment.</p>
      </aside>
    </section>
    <Transition name="mobile-cta"
      ><div v-if="showMobileCta" class="mobile-apply-bar">
        <button type="button" class="button" @click="openApplication">
          Lamar sekarang <span>→</span>
        </button>
      </div></Transition
    >

    <Teleport to="body"
      ><div
        v-if="showModal"
        class="application-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-modal-title"
      >
        <button
          class="modal-backdrop"
          type="button"
          aria-label="Tutup formulir"
          @click="closeApplication"
        ></button>
        <div class="application-modal-card glass-panel">
          <header class="modal-header">
            <div>
              <span class="eyebrow">LAMAR POSISI</span>
              <h2 id="application-modal-title">{{ vacancy.title }}</h2>
            </div>
            <button
              class="modal-close"
              type="button"
              aria-label="Tutup"
              @click="closeApplication"
            >
              ×
            </button>
          </header>
          <div v-if="!success" class="stepper">
            <div
              v-for="item in 3"
              :key="item"
              :class="{ active: step === item, done: step > item }"
            >
              <span>{{ step > item ? "✓" : item }}</span
              ><small>{{
                ["Profil & Kontak", "Pendidikan & Finansial", "Review"][
                  item - 1
                ]
              }}</small>
            </div>
          </div>
          <div v-if="success" class="success-state">
            <span>✓</span>
            <h2>Lamaran terkirim</h2>
            <p>{{ success }}</p>
            <button type="button" class="button" @click="closeApplication">
              Selesai
            </button>
          </div>
          <form
            v-else
            class="application-wizard"
            @submit.prevent="apply"
            novalidate
          >
            <div v-if="formError" class="form-alert" role="alert">
              {{ formError }}
            </div>
            <section v-show="step === 1" class="modal-step">
              <div class="step-heading">
                <span>LANGKAH 1 DARI 3</span>
                <h3>Profil & Kontak</h3>
                <p>Ceritakan informasi dasar dan kontak aktifmu.</p>
              </div>
              <div class="modal-form-grid">
                <label class="full-field"
                  >Nama lengkap<input
                    v-model.trim="form.name"
                    autocomplete="name"
                    placeholder="Nama sesuai identitas"
                  /><small v-if="errors.name">{{
                    errors.name[0]
                  }}</small></label
                ><label
                  >Email<input
                    v-model.trim="form.email"
                    type="email"
                    autocomplete="email"
                    placeholder="nama@email.com"
                  /><small v-if="errors.email">{{
                    errors.email[0]
                  }}</small></label
                ><label
                  >Nomor WhatsApp<input
                    v-model.trim="form.phone"
                    type="tel"
                    autocomplete="tel"
                    inputmode="tel"
                    placeholder="0812 3456 7890"
                  /><small v-if="errors.phone">{{
                    errors.phone[0]
                  }}</small></label
                ><label
                  >Status pernikahan<select v-model="form.marital_status">
                    <option value="" disabled>Pilih status</option>
                    <option>Belum Menikah</option>
                    <option>Menikah</option>
                    <option>Duda / Janda</option></select
                  ><small v-if="errors.marital_status">{{
                    errors.marital_status[0]
                  }}</small></label
                ><label
                  >Orang yang dikenal <span class="optional">Opsional</span
                  ><input
                    v-model.trim="form.known_person"
                    placeholder="Nama kerabat jika ada" /></label
                ><label class="full-field"
                  >Perusahaan sebelumnya <span class="optional">Opsional</span
                  ><input
                    v-model.trim="form.last_company"
                    placeholder="Nama perusahaan terakhir"
                /></label>
              </div>
            </section>
            <section v-show="step === 2" class="modal-step">
              <div class="step-heading">
                <span>LANGKAH 2 DARI 3</span>
                <h3>Pendidikan & Finansial</h3>
                <p>Lengkapi latar belakang dan ekspektasi kariermu.</p>
              </div>
              <div class="modal-form-grid">
                <label
                  >Pendidikan terakhir<select v-model="form.education_level">
                    <option value="" disabled>Pilih pendidikan</option>
                    <option>SMK</option>
                    <option>SMA</option>
                    <option>D3</option>
                    <option>D4</option>
                    <option>S1</option></select
                  ><small v-if="errors.education_level">{{
                    errors.education_level[0]
                  }}</small></label
                ><label
                  >Jurusan pendidikan<input
                    v-model.trim="form.education_major"
                    placeholder="Contoh: Teknik Informatika"
                  /><small v-if="errors.education_major">{{
                    errors.education_major[0]
                  }}</small></label
                ><label
                  >Gaji saat ini
                  <div class="money-input">
                    <span>Rp</span
                    ><input
                      :value="formatSalary(form.previous_salary)"
                      inputmode="numeric"
                      placeholder="5.000.000"
                      @input="
                        updateSalary('previous_salary', $event.target.value)
                      "
                    />
                  </div>
                  <small v-if="errors.previous_salary">{{
                    errors.previous_salary[0]
                  }}</small></label
                ><label
                  >Gaji yang diharapkan
                  <div class="money-input">
                    <span>Rp</span
                    ><input
                      :value="formatSalary(form.expected_salary)"
                      inputmode="numeric"
                      placeholder="7.000.000"
                      @input="
                        updateSalary('expected_salary', $event.target.value)
                      "
                    />
                  </div>
                  <small v-if="errors.expected_salary">{{
                    errors.expected_salary[0]
                  }}</small></label
                ><label
                  >Info lowongan dari<select v-model="form.referred_from">
                    <option value="" disabled>Pilih sumber info</option>
                    <option>LinkedIn</option>
                    <option>JobStreet</option>
                    <option>Indeed</option>
                    <option>Instagram</option>
                    <option>Website Resmi</option>
                    <option>Lainnya</option></select
                  ><small v-if="errors.referred_from">{{
                    errors.referred_from[0]
                  }}</small></label
                ><label class="file-field"
                  >CV / Resume (PDF, maks. 5 MB)<input
                    type="file"
                    accept="application/pdf,.pdf"
                    @change="onFile"
                  /><span>{{ form.resume?.name || "Pilih file PDF" }}</span
                  ><small v-if="errors.resume">{{
                    errors.resume[0]
                  }}</small></label
                >
              </div>
            </section>
            <section v-show="step === 3" class="modal-step">
              <div class="step-heading">
                <span>LANGKAH 3 DARI 3</span>
                <h3>Review Lamaran</h3>
                <p>Pastikan seluruh informasi sudah benar sebelum dikirim.</p>
              </div>
              <div class="review-position">
                <small>Posisi yang dilamar</small
                ><strong>{{ vacancy.title }}</strong
                ><span>{{
                  vacancy.location || vacancy.department || companyName
                }}</span>
              </div>
              <div class="review-section">
                <div class="review-title">
                  <h4>Profil & Kontak</h4>
                  <button type="button" @click="step = 1">Ubah</button>
                </div>
                <dl>
                  <div>
                    <dt>Nama lengkap</dt>
                    <dd>{{ form.name }}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{{ form.email }}</dd>
                  </div>
                  <div>
                    <dt>Nomor WhatsApp</dt>
                    <dd>{{ form.phone }}</dd>
                  </div>
                  <div>
                    <dt>Status pernikahan</dt>
                    <dd>{{ form.marital_status }}</dd>
                  </div>
                  <div>
                    <dt>Orang yang dikenal</dt>
                    <dd>{{ form.known_person || "-" }}</dd>
                  </div>
                  <div>
                    <dt>Perusahaan sebelumnya</dt>
                    <dd>{{ form.last_company || "-" }}</dd>
                  </div>
                </dl>
              </div>
              <div class="review-section">
                <div class="review-title">
                  <h4>Pendidikan & Finansial</h4>
                  <button type="button" @click="step = 2">Ubah</button>
                </div>
                <dl>
                  <div>
                    <dt>Pendidikan</dt>
                    <dd>
                      {{ form.education_level }} — {{ form.education_major }}
                    </dd>
                  </div>
                  <div>
                    <dt>Gaji saat ini</dt>
                    <dd>Rp {{ formatSalary(form.previous_salary) }}</dd>
                  </div>
                  <div>
                    <dt>Gaji yang diharapkan</dt>
                    <dd>Rp {{ formatSalary(form.expected_salary) }}</dd>
                  </div>
                  <div>
                    <dt>Sumber informasi</dt>
                    <dd>{{ form.referred_from }}</dd>
                  </div>
                  <div>
                    <dt>CV / Resume</dt>
                    <dd>{{ form.resume?.name }}</dd>
                  </div>
                </dl>
              </div>
              <div class="review-consent">
                Dengan mengirim lamaran, Anda menyetujui pemrosesan data untuk
                kebutuhan recruitment.
              </div>
            </section>
            <label class="honeypot" aria-hidden="true"
              >Website<input
                v-model="form.website"
                tabindex="-1"
                autocomplete="off"
            /></label>
            <footer class="modal-actions">
              <button
                v-if="step > 1"
                type="button"
                class="button-secondary"
                @click="previousStep"
              >
                ← Kembali</button
              ><span v-else></span
              ><button
                v-if="step < 3"
                type="button"
                class="button"
                @click="nextStep"
              >
                Lanjut →</button
              ><button v-else class="button" :disabled="submitting">
                {{ submitting ? "Mengirim..." : "Kirim lamaran" }} →
              </button>
            </footer>
          </form>
        </div>
      </div></Teleport
    >
  </template>
</template>
