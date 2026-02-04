{{- define "transport.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "transport.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := include "transport.name" . -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "transport.labels" -}}
app.kubernetes.io/name: {{ include "transport.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ if .Values.commonLabels }}
{{ toYaml .Values.commonLabels }}
{{- end }}
{{- end -}}

{{- define "transport.selectorLabels" -}}
app.kubernetes.io/name: {{ include "transport.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "transport.backend.fullname" -}}
{{- printf "%s-backend" (include "transport.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "transport.worker.fullname" -}}
{{- printf "%s-worker" (include "transport.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "transport.backend.serviceAccountName" -}}
{{- if .Values.backend.serviceAccount.name -}}
{{- .Values.backend.serviceAccount.name -}}
{{- else -}}
{{- include "transport.backend.fullname" . -}}
{{- end -}}
{{- end -}}

{{- define "transport.worker.serviceAccountName" -}}
{{- if .Values.worker.serviceAccount.name -}}
{{- .Values.worker.serviceAccount.name -}}
{{- else -}}
{{- include "transport.worker.fullname" . -}}
{{- end -}}
{{- end -}}

{{- define "transport.backend.configMapName" -}}
{{- if .Values.backend.config.existingName -}}
{{- .Values.backend.config.existingName -}}
{{- else if .Values.backend.config.name -}}
{{- .Values.backend.config.name -}}
{{- else -}}
{{- printf "%s-config" (include "transport.backend.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "transport.worker.configMapName" -}}
{{- if .Values.worker.config.existingName -}}
{{- .Values.worker.config.existingName -}}
{{- else if .Values.worker.config.name -}}
{{- .Values.worker.config.name -}}
{{- else -}}
{{- printf "%s-config" (include "transport.worker.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "transport.backend.secretName" -}}
{{- if .Values.backend.secret.existingName -}}
{{- .Values.backend.secret.existingName -}}
{{- else if .Values.backend.secret.name -}}
{{- .Values.backend.secret.name -}}
{{- else -}}
{{- printf "%s-secret" (include "transport.backend.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "transport.worker.secretName" -}}
{{- if .Values.worker.secret.existingName -}}
{{- .Values.worker.secret.existingName -}}
{{- else if .Values.worker.secret.name -}}
{{- .Values.worker.secret.name -}}
{{- else -}}
{{- printf "%s-secret" (include "transport.worker.fullname" .) -}}
{{- end -}}
{{- end -}}
