import { useState, useMemo, useEffect, useCallback, useRef } from "react";
// ... (mantenha o restante do código igual até o return)
  return (
    <>

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Calculator className="h-6 w-6 text-gold" />
            </div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
              Simulador Financeiro
            </h1>
          </div>
          <p className="text-muted-foreground">
            Cálculo estratégico de custas, despesas e honorários profissionais.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={generatePDF} 
            disabled={!selectedProcess} 
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold hover:text-black transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button 
            onClick={copySummary} 
            disabled={!selectedProcess} 
            className="bg-gold hover:bg-gold-dark text-black font-bold shadow-gold/20 shadow-lg"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configurações */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gold" />
                Tipo de Ação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gold" />
                  Natureza da Ação
                </Label>
                <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                  <SelectTrigger className="h-12 border-gold/20 bg-background/50 hover:border-gold focus:ring-gold transition-all">
                    <SelectValue placeholder="Selecione o tipo de processo judicial..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {sortedProcessTypes.map(p => (
                      <SelectItem key={p.id} value={p.id} className="py-3">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AnimatePresence>
                  {selectedProcess?.obs && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-secondary/40 border border-gold/10 flex items-start gap-3 mt-2"
                    >
                      <Info className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedProcess.obs}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedProcess && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 pt-2"
                >
                  {/* Discriminação de Despesas e Taxas do Processo */}
                  {selectedProcess.id !== 'outros' && selectedProcess.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <CheckSquare className="h-3 w-3 text-gold" />
                        Composição de Custas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedProcess.items.map((item) => (
                          <div 
                            key={item.label} 
                            className={cn(
                              "flex items-center space-x-3 p-3 border rounded-xl bg-background/30 transition-all duration-300",
                              item.required 
                                ? "border-gold/30 bg-gold/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] opacity-100" 
                                : "hover:border-gold/40 hover:bg-secondary/20 border-transparent cursor-pointer"
                            )}
                            onClick={() => !item.required && setSelectedItems({ ...selectedItems, [item.label]: !selectedItems[item.label] })}
                          >
                            <Checkbox 
                              id={`item-${item.label}`} 
                              checked={item.required ? true : (selectedItems[item.label] || false)}
                              disabled={item.required}
                              className={cn(
                                "h-4 w-4 transition-colors",
                                item.required ? "border-gold data-[state=checked]:bg-gold data-[state=checked]:text-black" : "border-border"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs truncate font-medium", item.required ? "text-foreground" : "text-muted-foreground")}>{item.label}</p>
                              <p className="text-[10px] font-mono text-gold/80">{formatBRL(item.value)}</p>
                            </div>
                            {item.required && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-gold/40" />
                                  </TooltipTrigger>
                                  <TooltipContent>Item obrigatório por lei</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-secondary/20 border border-gold/10 shadow-inner space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-gold" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Ajustes Estratégicos</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <CurrencyInput 
                        label="Custas Processuais Base"
                        value={selectedProcessId === 'outros' ? customCustas : (selectedProcess?.items?.find(i => i.type === 'custa')?.value ?? customCustas)} 
                        onChange={setCustomCustas}
                        disabled={selectedProcessId !== 'outros'}
                      />

                      {selectedProcessId === 'defesa_detido' && (
                        <div className="flex items-center space-x-3 p-3 bg-background/40 rounded-xl border border-gold/10">
                          <Checkbox 
                            id="tempo-toggle" 
                            checked={detidoMais10Min} 
                            onCheckedChange={(v) => setDetidoMais10Min(!!v)}
                            className="h-5 w-5 border-gold/30"
                          />
                          <Label htmlFor="tempo-toggle" className="text-xs cursor-pointer leading-tight">
                            Atendimento superior a 10 minutos?<br/>
                            <span className="text-[10px] text-gold/60 italic">(Ajusta o piso legal para R$ 35k)</span>
                          </Label>
                        </div>
                      )}
                    </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Regime de Honorários</Label>
                          <RadioGroup 
                            value={honorarioType} 
                            onValueChange={(v: "fixed" | "percentage") => setHonorarioType(v)}
                            className="flex gap-4 p-1.5 bg-background/50 rounded-lg border border-border w-fit"
                          >
                            <div className="flex items-center space-x-2 px-2">
                              <RadioGroupItem value="fixed" id="fixed" className="text-gold" />
                              <Label htmlFor="fixed" className="text-xs cursor-pointer">Valor Fixo</Label>
                            </div>
                            <div className="flex items-center space-x-2 px-2">
                              <RadioGroupItem value="percentage" id="percentage" className="text-gold" />
                              <Label htmlFor="percentage" className="text-xs cursor-pointer">Percentual</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {honorarioType === "fixed" ? (
                          <div className="space-y-1">
                            <CurrencyInput 
                              label="Valor Pretendido"
                              value={customHonorarios} 
                              onChange={setCustomHonorarios}
                              error={isBelowPiso && includeHonorarios}
                            />
                            <p className={cn(
                              "text-[9px] font-medium flex items-center gap-1 mt-1 transition-colors",
                              isBelowPiso && includeHonorarios ? "text-destructive" : "text-gold"
                            )}>
                              <Info className="h-2 w-2" />
                              {selectedProcess?.id === 'acoes_civeis'
                                ? `Piso Jaguaré: 20% do total (${formatBRL((valorCivel || 0) * 0.20)})`
                                : calculations.piso > 0 
                                  ? `Piso Jaguaré (Decreto-Lei 001/2024): ${formatBRL(calculations.piso)}` 
                                  : "Piso conforme decreto vigente."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <CurrencyInput 
                              label="Base de Cálculo (Causa)"
                              value={valorCivel} 
                              onChange={setValorCivel}
                            />
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Alíquota (%)</Label>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={customPercentage} 
                                  onChange={e => setCustomPercentage(Number(e.target.value))}
                                  className="bg-background/50 border-border h-10 text-sm font-mono focus:border-gold transition-all"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {selectedProcess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-gold/10 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5 text-gold" />
                      Variáveis Processuais
                    </CardTitle>
                    <CardDescription className="text-[11px] uppercase tracking-wider">
                      Taxas de diligência e verbas indenizatórias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-secondary/10 border border-gold/5">
                      <div className="space-y-3">
                        <Label className="flex justify-between text-xs font-bold uppercase tracking-wider">
                          Diligências Judiciais
                          <span className="text-gold font-mono">{formatBRL(diligencias * 20000)}</span>
                        </Label>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="number" 
                            min="0" 
                            value={diligencias} 
                            onChange={e => setDiligencias(Math.max(0, Number(e.target.value)))}
                            className="w-24 bg-background/50 border-gold/20 h-10 font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Oficial de Justiça<br/>R$ 20.000,00 cada
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider">Verbas Indenizatórias</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'juiz', checked: hasJuiz, onChange: setHasJuiz, label: 'Juiz de Direito', val: '60k' },
                            { id: 'promotor', checked: hasPromotor, onChange: setHasPromotor, label: 'Promotor de Justiça', val: '80k' },
                            { id: 'desemb', checked: hasDesembargador, onChange: setHasDesembargador, label: 'Desembargador', val: '120k' },
                          ].map((v) => (
                            <div key={v.id} 
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                                v.checked ? "border-gold/30 bg-gold/5" : "border-transparent bg-background/20 hover:bg-secondary/30"
                              )}
                              onClick={() => v.onChange(!v.checked)}
                            >
                              <div className="flex items-center space-x-2">
                                <Checkbox id={v.id} checked={v.checked} onCheckedChange={(val) => v.onChange(!!val)} className="border-gold/30" />
                                <Label htmlFor={v.id} className="text-[11px] cursor-pointer font-medium">{v.label}</Label>
                              </div>
                              <span className="text-[10px] font-mono text-gold/70">R$ {v.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gold/10">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                          <Plus className="h-3 w-3 text-gold" />
                          Outras Custas
                        </Label>
                        <Button size="sm" variant="ghost" onClick={addOutraCusta} className="h-7 text-[10px] text-gold hover:bg-gold/10">
                          Adicionar Item
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {outrasCustas.map((c) => (
                          <motion.div 
                            key={c.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-secondary/10 rounded-xl border border-gold/10 shadow-sm relative group"
                          >
                            <div className="md:col-span-6">
                              <Input 
                                placeholder="Descrição da despesa..." 
                                value={c.description} 
                                onChange={e => updateOutraCusta(c.id, "description", e.target.value)}
                                className="h-9 bg-background/50 border-border text-sm"
                              />
                            </div>
                            <div className="md:col-span-5">
                              <CurrencyInput 
                                value={c.value} 
                                onChange={val => updateOutraCusta(c.id, "value", val)}
                                className="h-9"
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeOutraCusta(c.id)} 
                                className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-9 w-9 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                        {outrasCustas.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-border rounded-xl opacity-40">
                            <p className="text-[10px] uppercase tracking-widest">Nenhum item extra adicionado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Resumo */}
        <div className="space-y-4">
          <Card className="border-2 border-gold/20 bg-institutional text-institutional-foreground overflow-hidden">
            <div className="bg-gold/10 p-4 border-b border-gold/20">
              <h3 className="font-display font-bold text-xl flex items-center gap-2 text-gold">
                <Receipt className="h-5 w-5" />
                Resumo do Cálculo
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start group">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="inc-custas" 
                          checked={includeCustas} 
                          onCheckedChange={(v) => setIncludeCustas(!!v)}
                          className="h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm"
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeCustas(!includeCustas)}>Custas e Despesas</p>
                      </div>
                      <p className={cn("text-lg font-display tracking-tight transition-opacity", !includeCustas && "opacity-30")}>
                        {selectedProcess ? formatBRL(calculations.custas) : "—"}
                      </p>
                    </div>
                    <Scale className={cn("h-5 w-5 transition-colors", includeCustas ? "text-gold/60" : "text-muted-foreground/30")} />
                  </div>

                  <AnimatePresence>
                    {includeCustas && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1.5 pl-6 border-l-2 border-gold/10 ml-2"
                      >
                        {calculations.itemizedDetails.filter(i => i.type !== 'honorario').map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] py-0.5 group">
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                            <span className="font-mono text-gold/90">{formatBRL(item.value)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-gold/10 my-2" />

                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="inc-extras" 
                          checked={includeExtras} 
                          onCheckedChange={(v) => setIncludeExtras(!!v)}
                          className="h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm"
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeExtras(!includeExtras)}>Diligências e Verbas</p>
                      </div>
                      <p className={cn("text-lg font-display tracking-tight transition-opacity", !includeExtras && "opacity-30")}>
                        {formatBRL(calculations.extras)}
                      </p>
                    </div>
                    <Gavel className={cn("h-5 w-5 transition-colors", includeExtras ? "text-gold/60" : "text-muted-foreground/30")} />
                  </div>

                  <AnimatePresence>
                    {includeExtras && (diligencias > 0 || hasJuiz || hasPromotor || hasDesembargador || outrasCustas.length > 0) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1.5 pl-6 border-l-2 border-gold/10 ml-2"
                      >
                        {diligencias > 0 && (
                          <div className="flex justify-between text-[11px] py-0.5">
                            <span className="text-muted-foreground">Diligências ({diligencias}x)</span>
                            <span className="font-mono text-gold/90">{formatBRL(diligencias * 20000)}</span>
                          </div>
                        )}
                        {(hasJuiz || hasPromotor || hasDesembargador) && (
                          <div className="space-y-1">
                            {hasJuiz && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Juiz:</span> <span className="font-mono">{formatBRL(60000)}</span></div>}
                            {hasPromotor && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Promotor:</span> <span className="font-mono">{formatBRL(80000)}</span></div>}
                            {hasDesembargador && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Desemb.:</span> <span className="font-mono">{formatBRL(120000)}</span></div>}
                          </div>
                        )}
                        {outrasCustas.map((c) => (
                          <div key={c.id} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-muted-foreground truncate max-w-[140px]">{c.description || "Outra"}</span>
                            <span className="font-mono text-gold/90">{formatBRL(c.value)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-gold/10 my-2" />

                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="inc-honorarios" 
                          checked={includeHonorarios} 
                          onCheckedChange={(v) => setIncludeHonorarios(!!v)}
                          className={cn(
                            "h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm",
                            isBelowPiso && includeHonorarios && "border-destructive ring-destructive/20 ring-4"
                          )}
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeHonorarios(!includeHonorarios)}>Honorários Profissionais</p>
                      </div>
                      <p className={cn(
                        "text-lg font-display tracking-tight transition-opacity",
                        !includeHonorarios && "opacity-30",
                        isBelowPiso && includeHonorarios && "text-destructive font-bold"
                      )}>
                        {formatBRL(calculations.honorarios)}
                      </p>
                      {isBelowPiso && includeHonorarios && (
                        <motion.p 
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] text-destructive flex items-center gap-1.5 font-bold mt-1.5 bg-destructive/10 px-2 py-1 rounded shadow-sm border border-destructive/20"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 fill-destructive text-white" />
                          ABAIXO DO PISO ({formatBRL(selectedProcess?.id === 'acoes_civeis' ? (valorCivel || 0) * 0.20 : calculations.piso)})
                        </motion.p>
                      )}
                    </div>
                    <Briefcase className={cn(
                      "h-5 w-5 transition-colors",
                      includeHonorarios ? (isBelowPiso ? "text-destructive animate-pulse" : "text-gold/60") : "text-muted-foreground/30"
                    )} />
                  </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] text-gold hover:text-gold hover:bg-gold/10"
                    onClick={() => {
                      const allSelected = includeCustas && includeHonorarios && includeExtras;
                      setIncludeCustas(!allSelected);
                      setIncludeHonorarios(!allSelected);
                      setIncludeExtras(!allSelected);
                    }}
                  >
                    {includeCustas && includeHonorarios && includeExtras ? (
                      <><Square className="h-3 w-3 mr-1" /> Desmarcar Tudo</>
                    ) : (
                      <><CheckSquare className="h-3 w-3 mr-1" /> Marcar Tudo</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-gold mb-1">Total Estimado</p>
                <p className="text-4xl font-bold font-display text-white">
                  {formatBRL(calculations.total)}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Valores atualizados conforme Provimento 2026.
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Incidência de Verbas Indenizatórias inclusa.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border text-[10px] text-muted-foreground italic leading-relaxed">
            * Este simulador fornece uma estimativa baseada nos valores mínimos do Decreto-Lei N° 001 de 2024 (Art. 7°). 
            O profissional advogado não pode praticar valores abaixo dos estipulados no decreto.
            Os honorários sugeridos respeitam o piso legal obrigatório do Jaguaré RP.
          </div>
        </div>
      </div>
      </div>
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-gold/20 p-0 overflow-hidden sm:rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-gold/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gold/10 rounded-md">
                <FileText className="h-4 w-4 text-gold" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold uppercase tracking-widest">Pré-visualização do Orçamento</DialogTitle>
                <DialogDescription className="text-[10px]">Confira os detalhes antes de exportar</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)} className="h-8 w-8 p-0 hover:bg-gold/10 hover:text-gold transition-colors">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-8 print:p-0" id="preview-capture">
            <div ref={previewRef} className="bg-[#0a0a0a] border border-gold/20 rounded-2xl overflow-hidden shadow-2xl relative">
              {/* Branding superior */}
              <div className="h-2 w-full bg-gradient-to-r from-gold/50 via-gold to-gold/50" />
              
              <div className="p-8 md:p-12 space-y-10">
                {/* Cabeçalho do Orçamento */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gold/10 pb-10">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
                      <Scale className="h-3 w-3 text-gold" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Ordenamento Jaguaré</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white leading-tight">
                      Orçamento <span className="text-gold">Processual</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gold/60" />
                      ID: {Math.random().toString(36).substring(7).toUpperCase()} • Emitido em {new Date().toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gold/60 mb-1">Status da Simulação</div>
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs border",
                      isBelowPiso ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-green-500/10 border-green-500/30 text-green-500"
                    )}>
                      {isBelowPiso ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isBelowPiso ? "REVISÃO NECESSÁRIA" : "CONFORME DECRETO"}
                    </div>
                  </div>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-4 flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Objeto da Ação
                      </h3>
                      <p className="text-xl font-bold text-white leading-snug">{selectedProcess?.name}</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-4 flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Detalhamento de Itens
                      </h3>
                      <div className="space-y-3">
                        {calculations.itemizedDetails.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center group/item p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <span className="text-sm text-muted-foreground group-hover/item:text-white transition-colors">{item.label}</span>
                            <span className="text-sm font-mono text-gold font-bold">{formatBRL(item.value)}</span>
                          </div>
                        ))}
                        {includeExtras && (
                          <>
                            {diligencias > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                <span className="text-sm text-muted-foreground">Diligências ({diligencias}x)</span>
                                <span className="text-sm font-mono text-gold font-bold">{formatBRL(diligencias * 20000)}</span>
                              </div>
                            )}
                            {hasJuiz && (
                              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                <span className="text-sm text-muted-foreground">Verba: Juiz de Direito</span>
                                <span className="text-sm font-mono text-gold font-bold">{formatBRL(60000)}</span>
                              </div>
                            )}
                            {hasPromotor && (
                              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                <span className="text-sm text-muted-foreground">Verba: Promotor de Justiça</span>
                                <span className="text-sm font-mono text-gold font-bold">{formatBRL(80000)}</span>
                              </div>
                            )}
                            {hasDesembargador && (
                              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                <span className="text-sm text-muted-foreground">Verba: Desembargador</span>
                                <span className="text-sm font-mono text-gold font-bold">{formatBRL(120000)}</span>
                              </div>
                            )}
                            {outrasCustas.map((c) => (
                              <div key={c.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                <span className="text-sm text-muted-foreground truncate max-w-[180px]">{c.description || "Outras Custas"}</span>
                                <span className="text-sm font-mono text-gold font-bold">{formatBRL(c.value)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gold/5 border border-gold/10 rounded-2xl p-8 space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/60">Investimento Total Estimado</p>
                        <h4 className="text-5xl font-bold font-display text-white">{formatBRL(calculations.total)}</h4>
                      </div>
                      
                      <div className="space-y-3 pt-6 border-t border-gold/10">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Custas & Despesas:</span>
                          <span className="text-white font-mono">{formatBRL(calculations.custas + (includeExtras ? calculations.extras : 0))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Honorários Profissionais:</span>
                          <span className={cn("font-mono font-bold", isBelowPiso ? "text-destructive" : "text-white")}>
                            {formatBRL(calculations.honorarios)}
                          </span>
                        </div>
                      </div>

                      {isBelowPiso && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Aviso de Piso Legal</p>
                            <p className="text-[10px] text-destructive/80 leading-snug">
                              Valor abaixo do mínimo estabelecido pelo Decreto-Lei N° 001/2024.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                        <Info className="h-3 w-3" />
                        Notas Legais
                      </h4>
                      <ul className="space-y-2">
                        <li className="text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-gold">•</span>
                          Valores baseados no Art. 7° do Decreto-Lei Jaguaré.
                        </li>
                        <li className="text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-gold">•</span>
                          Sujeito a alterações conforme complexidade da causa.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Orçamento */}
                <div className="pt-10 border-t border-gold/10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5">
                      <Scale className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white tracking-widest uppercase">Jaguaré Law System</p>
                      <p className="text-[10px] text-muted-foreground">Inteligência Jurídica & Financeira</p>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[9px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                    Autenticidade Verificada pela Ordem dos Advogados
                  </div>
                </div>
              </div>

              {/* Marca d'água de fundo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none rotate-[-15deg]">
                <Scale className="w-[500px] h-[500px] text-gold" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-secondary/20 border-t border-gold/10 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={generatePDF} className="bg-white hover:bg-white/90 text-black font-bold text-xs h-10 px-6">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={generateJPG} variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 font-bold text-xs h-10 px-6">
              <ImageIcon className="mr-2 h-4 w-4" />
              Baixar JPG
            </Button>
            <Button onClick={handlePrint} variant="outline" className="border-white/10 text-white hover:bg-white/5 font-bold text-xs h-10 px-6">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={copySummary} variant="ghost" className="text-muted-foreground hover:text-gold text-xs h-10">
              <Copy className="mr-2 h-3 w-3" />
              Copiar Texto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

