{{- define "excalidraw.name" -}}
{{ .Chart.Name }}
{{- end }}

{{- define "excalidraw.fullname" -}}
{{ include "excalidraw.name" . }}
{{- end }}

{{- define "excalidraw.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end }}
