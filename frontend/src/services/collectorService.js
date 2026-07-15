import { apiRequest } from "./apiClient";

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const normalizeCpf = (value) => {
  const normalized = normalizeText(value).replace(/\D/g, "");
  return normalized || "";
};

const normalizeCollectorJsonPayload = (payload = {}) => {
  const data = {
    name: normalizeText(payload.name),
    email: normalizeText(payload.email).toLowerCase(),
    status: payload.status || "AVAILABLE",
    isAutonomous:
      payload.isAutonomous === true ||
      payload.isAutonomous === "true",
  };

  const optionalFields = [
    "socialName",
    "phone",
    "rg",
    "birthDate",
    "sex",
    "gender",
    "address",
    "associationDate",
    "incomeRange",
    "socialBenefits",
    "occupationalDiseases",
    "socioeconomicNotes",
  ];

  optionalFields.forEach((field) => {
    const value = normalizeText(payload[field]);

    if (value) {
      data[field] = value;
    }
  });

  const cpf = normalizeCpf(payload.cpf);

  if (cpf) {
    data.cpf = cpf;
  }

  return data;
};

const appendFormDataValue = (formData, key, value) => {
  if (value === null || value === undefined || value === "") {
    return;
  }

  if (typeof value === "boolean") {
    formData.append(key, String(value));
    return;
  }

  formData.append(key, value);
};

const normalizeCollectorFormData = (payload = {}) => {
  if (payload instanceof FormData) {
    return payload;
  }

  const formData = new FormData();

  appendFormDataValue(formData, "name", normalizeText(payload.name));
  appendFormDataValue(
    formData,
    "email",
    normalizeText(payload.email).toLowerCase()
  );
  appendFormDataValue(
    formData,
    "status",
    payload.status || "AVAILABLE"
  );

  appendFormDataValue(
    formData,
    "socialName",
    normalizeText(payload.socialName)
  );
  appendFormDataValue(
    formData,
    "phone",
    normalizeText(payload.phone)
  );
  appendFormDataValue(
    formData,
    "cpf",
    normalizeCpf(payload.cpf)
  );
  appendFormDataValue(
    formData,
    "rg",
    normalizeText(payload.rg)
  );
  appendFormDataValue(
    formData,
    "birthDate",
    normalizeText(payload.birthDate)
  );
  appendFormDataValue(
    formData,
    "sex",
    normalizeText(payload.sex)
  );
  appendFormDataValue(
    formData,
    "gender",
    normalizeText(payload.gender)
  );
  appendFormDataValue(
    formData,
    "address",
    normalizeText(payload.address)
  );
  appendFormDataValue(
    formData,
    "associationDate",
    normalizeText(payload.associationDate)
  );
  appendFormDataValue(
    formData,
    "isAutonomous",
    payload.isAutonomous === true ||
      payload.isAutonomous === "true"
  );
  appendFormDataValue(
    formData,
    "incomeRange",
    normalizeText(payload.incomeRange)
  );
  appendFormDataValue(
    formData,
    "socialBenefits",
    normalizeText(payload.socialBenefits)
  );
  appendFormDataValue(
    formData,
    "occupationalDiseases",
    normalizeText(payload.occupationalDiseases)
  );
  appendFormDataValue(
    formData,
    "socioeconomicNotes",
    normalizeText(payload.socioeconomicNotes)
  );

  if (payload.documentType) {
    appendFormDataValue(
      formData,
      "documentType",
      normalizeText(payload.documentType)
    );
  }

  if (payload.documentName) {
    appendFormDataValue(
      formData,
      "documentName",
      normalizeText(payload.documentName)
    );
  }

  if (payload.documentNotes) {
    appendFormDataValue(
      formData,
      "documentNotes",
      normalizeText(payload.documentNotes)
    );
  }

  if (payload.photo instanceof File) {
    formData.append("photo", payload.photo);
  }

  const documents = Array.isArray(payload.documents)
    ? payload.documents
    : [];

  documents.forEach((file) => {
    if (file instanceof File) {
      formData.append("documents", file);
    }
  });

  return formData;
};

const hasUploadFiles = (payload = {}) => {
  if (payload instanceof FormData) {
    return true;
  }

  if (payload.photo instanceof File) {
    return true;
  }

  return (
    Array.isArray(payload.documents) &&
    payload.documents.some((file) => file instanceof File)
  );
};

export const getAllCollectors = async () => {
  return apiRequest("/collectors", {
    method: "GET",
  });
};

export const getCollectorById = async (id) => {
  if (!id) {
    throw new Error("ID do catador não informado.");
  }

  return apiRequest(`/collectors/${id}`, {
    method: "GET",
  });
};

export const createCollector = async (payload) => {
  const useFormData = hasUploadFiles(payload);

  return apiRequest("/collectors", {
    method: "POST",
    body: useFormData
      ? normalizeCollectorFormData(payload)
      : normalizeCollectorJsonPayload(payload),
  });
};

export const updateCollectorStatus = async (id, status) => {
  if (!id) {
    throw new Error("ID do catador não informado.");
  }

  return apiRequest(`/collectors/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};

export const updateCollector = async (id, payload) => {
  if (!id) {
    throw new Error("ID do catador não informado.");
  }

  if (!payload?.status) {
    throw new Error(
      "A atualização completa do catador ainda não possui endpoint próprio."
    );
  }

  return updateCollectorStatus(id, payload.status);
};

export const getCollectorDocuments = async (collectorId) => {
  if (!collectorId) {
    throw new Error("ID do catador não informado.");
  }

  return apiRequest(`/collectors/${collectorId}/documents`, {
    method: "GET",
  });
};

export const addCollectorDocument = async (
  collectorId,
  payload = {}
) => {
  if (!collectorId) {
    throw new Error("ID do catador não informado.");
  }

  const file =
    payload.document ||
    payload.file ||
    (Array.isArray(payload.documents)
      ? payload.documents[0]
      : null);

  if (!(file instanceof File)) {
    throw new Error("Selecione um documento para anexar.");
  }

  const formData = new FormData();

  formData.append("document", file);

  appendFormDataValue(
    formData,
    "documentType",
    normalizeText(payload.documentType)
  );

  appendFormDataValue(
    formData,
    "documentName",
    normalizeText(payload.documentName)
  );

  appendFormDataValue(
    formData,
    "notes",
    normalizeText(payload.notes || payload.documentNotes)
  );

  return apiRequest(`/collectors/${collectorId}/documents`, {
    method: "POST",
    body: formData,
  });
};

export const deleteCollectorDocument = async (
  collectorId,
  documentId
) => {
  if (!collectorId) {
    throw new Error("ID do catador não informado.");
  }

  if (!documentId) {
    throw new Error("ID do documento não informado.");
  }

  return apiRequest(
    `/collectors/${collectorId}/documents/${documentId}`,
    {
      method: "DELETE",
    }
  );
};