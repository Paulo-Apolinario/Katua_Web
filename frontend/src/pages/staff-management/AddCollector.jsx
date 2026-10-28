import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  FileUp,
  House,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { createCollector, getCollectorById, updateCollector } from "../../services/collectorService";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const initialForm = {
  name: "",
  socialName: "",
  email: "",
  phone: "",
  cpf: "",
  rg: "",
  birthDate: "",
  sex: "",
  gender: "",
  address: "",
  associationDate: "",
  registrationNumber: "",
  membershipCategory: "",
  isAutonomous: "false",
  incomeRange: "",
  socialBenefits: "",
  occupationalDiseases: "",
  socioeconomicNotes: "",
  status: "AVAILABLE",
  documents: [],
};

const SEX_OPTIONS = [
  {
    value: "FEMALE",
    label: "Feminino",
  },
  {
    value: "MALE",
    label: "Masculino",
  },
  {
    value: "INTERSEX",
    label: "Intersexo",
  },
  {
    value: "NOT_INFORMED",
    label: "Prefere não informar",
  },
];

const GENDER_OPTIONS = [
  {
    value: "CIS_WOMAN",
    label: "Mulher cisgênero",
  },
  {
    value: "CIS_MAN",
    label: "Homem cisgênero",
  },
  {
    value: "TRANS_WOMAN",
    label: "Mulher transgênero",
  },
  {
    value: "TRANS_MAN",
    label: "Homem transgênero",
  },
  {
    value: "NON_BINARY",
    label: "Não binário",
  },
  {
    value: "OTHER",
    label: "Outro",
  },
  {
    value: "NOT_INFORMED",
    label: "Prefere não informar",
  },
];

const INCOME_OPTIONS = [
  {
    value: "ATE_1_SM",
    label: "Até 1 salário mínimo",
  },
  {
    value: "1_A_2_SM",
    label: "De 1 a 2 salários mínimos",
  },
  {
    value: "2_A_3_SM",
    label: "De 2 a 3 salários mínimos",
  },
  {
    value: "ACIMA_3_SM",
    label: "Acima de 3 salários mínimos",
  },
  {
    value: "NAO_INFORMADO",
    label: "Prefere não informar",
  },
];

const formatFileSize = (size) => {
  if (!Number.isFinite(size)) {
    return "-";
  }

  if (size < 1024) {
    return `${size} bytes`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeCpf = (value) => {
  return String(value || "").replace(/\D/g, "");
};

const isValidCpfLength = (value) => {
  const cpf = normalizeCpf(value);

  return !cpf || cpf.length === 11;
};

const AddCollector = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadError("");
    if (!id) { setForm(initialForm); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    getCollectorById(id).then(response => {
      if (!active) return;
      const collector = response?.collector;
      if (!collector?.id) throw new Error("Cadastro não encontrado.");
      const values = Object.fromEntries(Object.keys(initialForm).map(key => [key, collector[key] ?? initialForm[key]]));
      setForm({ ...values, associationDate: collector.associationDate?.slice(0, 10) || "", isAutonomous: collector.isAutonomous ? "true" : "false", status: collector.status === "INACTIVE" ? "INACTIVE" : "AVAILABLE", documents: [] });
    }).catch(error => { if (active) setLoadError(error?.error || error?.message || "Não foi possível carregar o cadastro."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, loadAttempt]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDocumentsChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const currentFiles = Array.isArray(form.documents)
      ? form.documents
      : [];

    const mergedFiles = [...currentFiles];

    selectedFiles.forEach((file) => {
      const alreadyAdded = mergedFiles.some(
        (currentFile) =>
          currentFile.name === file.name &&
          currentFile.size === file.size &&
          currentFile.lastModified === file.lastModified
      );

      if (!alreadyAdded) {
        mergedFiles.push(file);
      }
    });

    if (mergedFiles.length > MAX_FILES) {
      toast.error(
        `É permitido anexar no máximo ${MAX_FILES} documentos.`
      );

      resetFileInput();
      return;
    }

    const invalidTypeFile = mergedFiles.find(
      (file) => !ALLOWED_FILE_TYPES.includes(file.type)
    );

    if (invalidTypeFile) {
      toast.error(
        `O arquivo "${invalidTypeFile.name}" possui formato não permitido.`
      );

      resetFileInput();
      return;
    }

    const oversizedFile = mergedFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      toast.error(
        `O arquivo "${oversizedFile.name}" ultrapassa o limite de 10 MB.`
      );

      resetFileInput();
      return;
    }

    setForm((current) => ({
      ...current,
      documents: mergedFiles,
    }));

    resetFileInput();
  };

  const handleRemoveDocument = (indexToRemove) => {
    setForm((current) => ({
      ...current,
      documents: current.documents.filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do catador.");
      return false;
    }

    if (form.name.trim().length < 2) {
      toast.error("O nome deve possuir pelo menos 2 caracteres.");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Informe o e-mail do catador.");
      return false;
    }

    if (!isValidCpfLength(form.cpf)) {
      toast.error("O CPF deve possuir 11 dígitos.");
      return false;
    }

    if (
      Array.isArray(form.documents) &&
      form.documents.length > MAX_FILES
    ) {
      toast.error(
        `É permitido anexar no máximo ${MAX_FILES} documentos.`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const save = isEditing ? payload => updateCollector(id, payload) : createCollector;
      const response = await save({
        ...form,
        name: form.name.trim(),
        socialName: form.socialName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        cpf: normalizeCpf(form.cpf),
        rg: form.rg.trim(),
        address: form.address.trim(),
        socialBenefits: form.socialBenefits.trim(),
        occupationalDiseases:
          form.occupationalDiseases.trim(),
        socioeconomicNotes:
          form.socioeconomicNotes.trim(),
      });

      if (response?.success === false) {
        throw response;
      }

      toast.success(
        response?.message ||
          "Cadastro efetuado com sucesso."
      );

      setForm(initialForm);
      resetFileInput();

      navigate("/collector-list");
    } catch (error) {
      console.error(
        "Erro ao cadastrar catador:",
        error
      );

      const validationErrors = error?.errors;

      if (
        validationErrors &&
        typeof validationErrors === "object"
      ) {
        const firstValidationMessage =
          Object.values(validationErrors)
            .flat()
            .find(Boolean);

        if (firstValidationMessage) {
          toast.error(firstValidationMessage);
          return;
        }
      }

      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível cadastrar o catador."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadError) return <><ManagementHeader title="Editar Catador" description="Atualize os dados cadastrais e de filiação." /><div className="card p-25" role={loadError ? "alert" : "status"}>{loading ? "Carregando cadastro..." : <><p>{loadError}</p><button className="primary-btn" onClick={() => setLoadAttempt(n => n + 1)}>Tentar novamente</button><Link className="secondary-btn ms-2" to="/collector-list">Voltar para catadores</Link></>}</div></>;

  return (
    <>
      <HeadTags title={`${isEditing ? "Editar" : "Adicionar"} Catador | KATUÁ`} />
      <TopProgressBar loading={saving} />

      <ManagementHeader
        title={isEditing ? "Editar Catador" : "Adicionar Catador"}
        description={isEditing ? "Atualize os dados pessoais, de filiação e socioeconômicos do catador." : "Cadastre dados pessoais, cooperativos, socioeconômicos e documentos do catador."}
        actions={
          <>
            <Link to="/collector-list" className="secondary-btn btn-sm">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="card p-25 mb-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#ecfdf5",
              }}
            >
              <UserPlus size={24} />
            </div>

            <div>
              <h4 className="mb-1 fw-600">
                Identificação do Catador
              </h4>

              <p className="text-muted mb-0">
                Informe os dados pessoais e de contato.
              </p>
            </div>
          </div>

          <div className="row gy-3">
            <div className="col-md-6">
              <label
                htmlFor="name"
                className="form-label"
              >
                Nome civil{" "}
                <span className="text-danger">*</span>
              </label>

              <input
                id="name"
                name="name"
                type="text"
                className="form-control"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome completo do catador"
                maxLength={150}
                disabled={saving}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="socialName"
                className="form-label"
              >
                Nome social
              </label>

              <input
                id="socialName"
                name="socialName"
                type="text"
                className="form-control"
                value={form.socialName}
                onChange={handleChange}
                placeholder="Nome social, quando aplicável"
                maxLength={150}
                disabled={saving}
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="email"
                className="form-label"
              >
                E-mail{" "}
                <span className="text-danger">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                placeholder="email@exemplo.com"
                maxLength={255}
                disabled={saving}
                required
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="phone"
                className="form-label"
              >
                Telefone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-control"
                value={form.phone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                maxLength={30}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label
                htmlFor="cpf"
                className="form-label"
              >
                CPF
              </label>

              <input
                id="cpf"
                name="cpf"
                type="text"
                className="form-control"
                value={form.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                maxLength={14}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label
                htmlFor="rg"
                className="form-label"
              >
                RG
              </label>

              <input
                id="rg"
                name="rg"
                type="text"
                className="form-control"
                value={form.rg}
                onChange={handleChange}
                placeholder="Número do RG"
                maxLength={30}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label
                htmlFor="birthDate"
                className="form-label"
              >
                Data de nascimento
              </label>

              <input
                id="birthDate"
                name="birthDate"
                type="date"
                className="form-control"
                value={form.birthDate}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="col-md-6">
              <label
                htmlFor="sex"
                className="form-label"
              >
                Sexo
              </label>

              <select
                id="sex"
                name="sex"
                className="form-select"
                value={form.sex}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">
                  Selecione o sexo
                </option>

                {SEX_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <small className="text-muted">
                Informação biológica declarada no
                cadastro.
              </small>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="gender"
                className="form-label"
              >
                Gênero
              </label>

              <select
                id="gender"
                name="gender"
                className="form-select"
                value={form.gender}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">
                  Selecione o gênero
                </option>

                {GENDER_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <small className="text-muted">
                Identidade de gênero informada pelo
                catador.
              </small>
            </div>

            <div className="col-md-12">
              <label
                htmlFor="address"
                className="form-label"
              >
                Endereço
              </label>

              <input
                id="address"
                name="address"
                type="text"
                className="form-control"
                value={form.address}
                onChange={handleChange}
                placeholder="Rua, número, bairro, cidade e UF"
                maxLength={500}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="card p-25 mb-4">
          <div className="mb-4">
            <h4 className="mb-1 fw-600">
              Dados Cooperativos
            </h4>

            <p className="text-muted mb-0">
              Informe a filiação e a situação cadastral
              do catador.
            </p>
          </div>

          <div className="row gy-3">
            <div className="col-md-4">
              <label
                htmlFor="associationDate"
                className="form-label"
              >
                Data de Filiação
              </label>

              <input
                id="associationDate"
                name="associationDate"
                type="date"
                className="form-control"
                value={form.associationDate}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="registrationNumber" className="form-label">Número de Inscrição</label>
              <input id="registrationNumber" name="registrationNumber" className="form-control" maxLength={50} value={form.registrationNumber} onChange={handleChange} disabled={saving} placeholder="Ex.: 001/2026" />
            </div>
            <div className="col-md-4">
              <label htmlFor="membershipCategory" className="form-label">Categoria</label>
              <select id="membershipCategory" name="membershipCategory" className="form-select" value={form.membershipCategory} onChange={handleChange} disabled={saving}>
                <option value="">Selecione a categoria</option>
                <option value="FOUNDER">Fundador</option>
                <option value="EFFECTIVE">Efetivo</option>
                <option value="BENEFICIARY">Beneficiado</option>
                <option value="CONTRIBUTOR">Contribuinte</option>
              </select>
            </div>
            <div className="col-md-6">
              <label
                htmlFor="isAutonomous"
                className="form-label"
              >
                Autônomo
              </label>

              <select
                id="isAutonomous"
                name="isAutonomous"
                className="form-select"
                value={form.isAutonomous}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>

            <div className="col-md-6">
              <label
                htmlFor="status"
                className="form-label"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                className="form-select"
                value={form.status}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="AVAILABLE">
                  Ativo
                </option>

                <option value="INACTIVE">
                  Inativo
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-25 mb-4">
          <div className="mb-4">
            <h4 className="mb-1 fw-600">
              Perfil Socioeconômico
            </h4>

            <p className="text-muted mb-0">
              Registre informações importantes para
              análises sociais e operacionais.
            </p>
          </div>

          <div className="row gy-3">
            <div className="col-md-4">
              <label
                htmlFor="incomeRange"
                className="form-label"
              >
                Faixa de renda
              </label>

              <select
                id="incomeRange"
                name="incomeRange"
                className="form-select"
                value={form.incomeRange}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">
                  Selecione uma faixa
                </option>

                {INCOME_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label
                htmlFor="socialBenefits"
                className="form-label"
              >
                Benefícios sociais
              </label>

              <input
                id="socialBenefits"
                name="socialBenefits"
                type="text"
                className="form-control"
                value={form.socialBenefits}
                onChange={handleChange}
                placeholder="Ex.: Bolsa Família, BPC ou nenhum"
                maxLength={1500}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label
                htmlFor="occupationalDiseases"
                className="form-label"
              >
                Doenças ocupacionais
              </label>

              <input
                id="occupationalDiseases"
                name="occupationalDiseases"
                type="text"
                className="form-control"
                value={form.occupationalDiseases}
                onChange={handleChange}
                placeholder="Ex.: dores, lesões ou doenças respiratórias"
                maxLength={1500}
                disabled={saving}
              />
            </div>

            <div className="col-md-12">
              <label
                htmlFor="socioeconomicNotes"
                className="form-label"
              >
                Observações socioeconômicas
              </label>

              <textarea
                id="socioeconomicNotes"
                name="socioeconomicNotes"
                className="form-control"
                rows="4"
                value={form.socioeconomicNotes}
                onChange={handleChange}
                placeholder="Informações complementares do perfil socioeconômico."
                maxLength={3000}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {!isEditing && <>
        <div className="card p-25 mb-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#eff6ff",
              }}
            >
              <FileUp size={24} />
            </div>

            <div>
              <h4 className="mb-1 fw-600">
                Documentos do Catador
              </h4>

              <p className="text-muted mb-0">
                Anexe RG, CPF, comprovante de residência,
                termo de associação ou outros documentos.
              </p>
            </div>
          </div>

          <div className="row gy-3">
            <div className="col-md-12">
              <label
                htmlFor="collector-documents"
                className="form-label"
              >
                Selecionar documentos
              </label>

              <div className="left-inner-addon">
                <span className="icon">
                  <FileUp size={18} />
                </span>

                <input
                  ref={fileInputRef}
                  id="collector-documents"
                  type="file"
                  className="form-control"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleDocumentsChange}
                  disabled={saving}
                />
              </div>

              <small className="text-muted d-block mt-1">
                Formatos aceitos: PDF, JPG, PNG e WEBP.
                Máximo de 10 arquivos e 10 MB por arquivo.
              </small>
            </div>

            {form.documents.length > 0 && (
              <div className="col-md-12">
                <div
                  className="border rounded-3 p-3"
                  style={{
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <strong>
                      Documentos selecionados
                    </strong>

                    <span className="text-muted small">
                      {form.documents.length}/{MAX_FILES}
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    {form.documents.map(
                      (file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="d-flex justify-content-between align-items-center gap-3 border rounded-3 p-3 bg-white"
                        >
                          <div className="d-flex align-items-center gap-3 overflow-hidden">
                            <FileText
                              size={20}
                              style={{
                                flexShrink: 0,
                              }}
                            />

                            <div className="overflow-hidden">
                              <div
                                className="fw-600 text-truncate"
                                title={file.name}
                              >
                                {file.name}
                              </div>

                              <small className="text-muted">
                                {formatFileSize(
                                  file.size
                                )}
                              </small>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleRemoveDocument(
                                index
                              )
                            }
                            disabled={saving}
                            title="Remover documento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        </>}

        <div className="card p-25">
          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <Link
              to="/collector-list"
              className="btn btn-light"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="primary-btn border-0"
              disabled={saving}
            >
              <Save size={16} />

              {saving
                ? "Salvando..."
                : isEditing ? "Salvar alterações" : "Salvar Catador"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddCollector;